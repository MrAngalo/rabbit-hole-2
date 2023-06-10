import express, { RequestHandler } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { PassportStatic } from 'passport';
import { checkAuthenticated, checkNotAuthenticated } from './middleware';
import { User } from '../entities/User';
import { Token, TokenType } from '../entities/Token'
import { Brackets, DataSource } from 'typeorm';
import { sendMail, sendVerificationEmail } from '../config/mailer';

module.exports = authenticationRouter
export = authenticationRouter;

const router = express.Router();
function authenticationRouter(config:{dataSource: DataSource, passport: PassportStatic}) {
    
    router.get('/login', checkNotAuthenticated, function (req, res) {
        //from verification emails
        let token = (req.query.token != undefined) ? req.query.token+'' : null;
        res.render("login", {csrfToken: req.csrfToken(), token });
    });

    router.get('/register', checkNotAuthenticated, function (req, res) {
        res.render("register", {csrfToken: req.csrfToken()});
    });
    
    router.get('/verify', checkNotAuthenticated, function (req, res) {
        res.render("verify", {csrfToken: req.csrfToken()});
    });

    router.get('/account', checkAuthenticated, function (req, res) {
        res.render("account", {csrfToken: req.csrfToken()});
    });

    router.get('/logout', function (req, res) {
        res.redirect('/account');
    });

    router.post('/register', checkNotAuthenticated, async function (req, res) {
        const uname:string = req.body.username;
        const email:string = req.body.email;
        const rawPwd:string = req.body.password;

        // validate registration
        let error = await (async () => {
            if (!String(email).toLowerCase().match(
                /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/))
                return `Email is not valid!`;
          
            if (uname.length < 3)
                return `Username must contain 3 characters!`;
          
            if (uname.match(/\s/))
                return `Username cannot contain spaces!`;
          
            if (!uname.match(/^[A-Za-z0-9_]+$/))
                return `Username must contain valid characters!`;
          
            if (rawPwd.length < 8)
                return `Password must contain 8 characters!`;
          
            if (rawPwd.match(/\s/))
                return `Password cannot contain spaces!`;
          
            if (!rawPwd.match(/^[A-Za-z0-9!@#$%^&*]+$/))
                return `Password must contain valid characters!`;
          
            // if (!rawPwd.match(/[A-Z]/g))
            //   return `Password must contain one uppercase letter`;
          
            if (!rawPwd.match(/[0-9]/g))
                return `Password must contain one number`;
              
            // if (!rawPwd.match(/[!@#$%^&*]/g))
            //   return `Password must contain one special character`;
          
            const other = await config.dataSource.getRepository(User)
                .createQueryBuilder('user')
                .select([ 'user.id' ])
                .where('user.username_lower = :u OR user.email = :e', { u: uname.toLowerCase(), e: email})
                .getOne();
          
            if (other != null)
                return `There is already an account associated with the email or username`
          
            return null;
        })();

        if (error != null) {
            (req.session as any).myinfo = { error };
            (req.session as any).fields = req.body;
            res.redirect('/register');
            return;
        }

        try {
            const hashPwd = await bcrypt.hash(rawPwd, 10);
            const user = User.create({
                username: uname,
                username_lower: uname.toLowerCase(),
                email: email.toLowerCase(),
                password: hashPwd
            });
            
            const token = Token.create({
                owner: user,
                session: req.sessionID,
                value: crypto.randomBytes(12).toString('hex'),
                type: TokenType.VERIFY
            });

            await user.save();
            await token.save();

            //sends mail async
            sendVerificationEmail(email, token.value);
            
            (req.session as any).myinfo = { info: 'Successfully created an account! Please verify your email before loggin in.' };
            res.redirect('/login');

        } catch (err) {
            console.log(err);
            (req.session as any).myinfo = {error: 'Error: Something has gone wrong, please try again!'};
            (req.session as any).fields = req.body;
            res.redirect('/register');
            return;
        }
    });

    //only resends email verification token, validation occurs in passport-config
    router.post('/verify', checkNotAuthenticated, async function (req, res) {
        const email:string = req.body.email;
        const user = await config.dataSource.getRepository(User)
            .createQueryBuilder('user')
            .select([
                'user.id',
                'user.email',
                'user.confirmed',
            ])
            .where('user.email = :email', { email })
            .getOne();

        //genetic response to vessel information about users
        if (user == null || user.confirmed) {
            (req.session as any).myinfo = { info: 'If the email exists in the system, a verification email will be sent shortly.' };
            (req.session as any).fields = req.body;
            res.redirect(`/login`);
            return;
        }

        //previousTokens is used to analyze previous requests created to an email
        //or by a session (although clearing cookies will bypass req.sessionID)
        //if requests are too frequent, it will escape, acting as a spam filter.
        const previousTokens = await config.dataSource.getRepository(Token)
            .createQueryBuilder('token')
            .leftJoinAndSelect('token.owner', 'owner')
            .select([
                'token.id',
                'token.type',
                'token.created',
                'token.value',
                'owner.id'
            ])
            .where(new Brackets(qb => qb
                .where('owner.id = :userid', { userid: user.id }) /* request to email */
                .orWhere('token.session = :session', { session: req.sessionID }) /* request from session */
            ))
            .andWhere('token.type = :type', { type: TokenType.VERIFY })
            .getMany();

        //found old tokens which may be valid, expired, spam, and/or to other users
        if (previousTokens.length > 0) {

            //filters tokens that were created in the last five minutes;
            const spamThreshold = 5*60*1000; //5 minutes;
            const now = new Date().getTime();
            let spamTokens = previousTokens.filter(token => token.created.getTime() + spamThreshold > now);

            //spam detected
            if (spamTokens.length > 0) {
                (req.session as any).myinfo = { warn: 'You already sent a verification email! Please wait 5 minutes.' };
                (req.session as any).fields = req.body;
                res.redirect(`/verify`);
                return;
            }
            //success!

            //filters and deletes old user tokens (since we also queried sessions that may not be from user)
            let userTokens = previousTokens.filter(token => token.owner.id == user.id );
            userTokens.forEach(token => token.remove()); //removes async
        }

        //success!
        const token = Token.create({
            owner: user,
            session: req.sessionID,
            value: crypto.randomBytes(12).toString('hex'),
            type: TokenType.VERIFY
        });
        await token.save();
        
        //sends mail async
        sendVerificationEmail(email, token.value);

        (req.session as any).myinfo = { info: 'If the email exists in the system, a verification email will be sent shortly.' };
        (req.session as any).fields = req.body;
        res.redirect(`/login`);
        return;
    });

    router.post('/login', checkNotAuthenticated, config.passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/login',
        failureFlash: true,
    }));

    router.post('/logout', checkAuthenticated, function (req, res, next) {
        req.logOut(function(err) {
            if (err) return next(err);
            (req.session as any).myinfo = { info: 'Successfully logged out!' };
            res.redirect('/login');
        });
    });

    return router;
}
