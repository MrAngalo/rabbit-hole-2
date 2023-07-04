import express, { RequestHandler } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { PassportStatic } from 'passport';
import { checkAuthenticated, checkNotAuthenticated } from '../middleware';
import { User } from '../../entities/User';
import { Token, TokenType } from '../../entities/Token'
import { Brackets, DataSource } from 'typeorm';
import { sendMail, sendResetPasswordEmail, sendVerificationEmail } from '../../config/mailer';

export function authRouter(config:{dataSource: DataSource, passport: PassportStatic}) {
    
    const router = express.Router();
    router.get('/login', checkNotAuthenticated, function (req, res) {
        //from verification emails
        let token = (req.query.token != undefined) ? req.query.token+'' : null;
        res.render("auth/login", {css: ['auth/layout'], csrfToken: req.csrfToken(), token });
    });

    router.get('/register', checkNotAuthenticated, function (req, res) {
        res.render("auth/register", {css: ['auth/layout'], csrfToken: req.csrfToken()});
    });
    
    router.get('/verify', checkNotAuthenticated, function (req, res) {
        res.render("auth/verify", {css: ['auth/layout'], csrfToken: req.csrfToken()});
    });
    
    router.get('/pwreset', function (req, res) {
        res.render("auth/pwreset", {css: ['auth/layout'], csrfToken: req.csrfToken()});
    });

    router.get('/pwnew', function (req, res) {
        let token = req.query.token; //must have token to continue
        if (token != undefined) {
            res.render("auth/pwnew", {css: ['auth/layout'], csrfToken: req.csrfToken(), token });
        } else {
            res.redirect('/pwreset');
        }
    });

    router.get('/logout', function (req, res) {
        res.redirect('/account');
    });

    router.post('/register', checkNotAuthenticated, async function (req, res) {
        const username:string = req.body.username;
        const email:string = req.body.email.toLowerCase();
        const password:string = req.body.password;
        const password2:string = req.body.password2;

        let error = User.validateEmail(email) ||
                    User.validateUsername(username) ||
                    User.validatePassword(password, password2);

        if (error != null) {
            (req.session as any).myinfo = { error };
            (req.session as any).fields = req.body;
            res.redirect('/register');
            return;
        }

        const doppelganger = await config.dataSource.getRepository(User)
            .createQueryBuilder('user')
            .select([ 'user.id' ])
            .where('user.username_lower = :u', { u: username.toLowerCase() })
            .orWhere('user.email = :e', { e: email })
            .getOne();
          
        if (doppelganger != null) {
            (req.session as any).myinfo = { error: 'There is already an account associated with the email or username' };
            (req.session as any).fields = req.body;
            res.redirect('/register');
            return;
        }

        try {
            const hashPwd = await bcrypt.hash(password, 10);
            const user = User.create({
                username: username,
                username_lower: username.toLowerCase(),
                email: email,
                password: hashPwd
            });
            
            await user.save();

            const token = Token.create({
                owner: user,
                session: req.sessionID,
                value: crypto.randomBytes(12).toString('hex'),
                type: TokenType.VERIFY
            });

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
        const email:string = req.body.email.toLowerCase();
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
        //lenience is 1 token
        if (previousTokens.length > 1) {

            //filters tokens that were created in the last five minutes;
            const spamThreshold = 5*60*1000; //5 minutes;
            const now = new Date().getTime();
            let spamTokens = previousTokens.filter(token => token.created.getTime() + spamThreshold > now);

            //spam detected
            if (spamTokens.length > 0) {
                (req.session as any).myinfo = { warn: 'You already requested a verification email! Please wait 5 minutes.' };
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

    //only sends reset password token
    router.post('/pwreset', checkNotAuthenticated, async function (req, res) {
        const email:string = req.body.email.toLowerCase();
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
        if (user == null) {
            (req.session as any).myinfo = { info: 'If the email exists in the system, a password reset email will be sent shortly.' };
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
            .andWhere('token.type = :type', { type: TokenType.PW_RESET })
            .getMany();

        //found old tokens which may be valid, expired, spam, and/or to other users
        //lenience is 1 token
        if (previousTokens.length > 1) {

            //filters tokens that were created in the last five minutes;
            const spamThreshold = 5*60*1000; //5 minutes;
            const now = new Date().getTime();
            let spamTokens = previousTokens.filter(token => token.created.getTime() + spamThreshold > now);

            //spam detected
            if (spamTokens.length > 0) {
                (req.session as any).myinfo = { warn: 'You already requested a password reset email! Please wait 5 minutes.' };
                (req.session as any).fields = req.body;
                res.redirect(`/pwreset`);
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
            type: TokenType.PW_RESET,
        });
        await token.save();
        
        //sends mail async
        sendResetPasswordEmail(email, token.value);

        (req.session as any).myinfo = { info: 'If the email exists in the system, a password reset email will be sent shortly.' };
        (req.session as any).fields = req.body;
        res.redirect(`/login`);
        return;
    });

    
    router.post('/pwnew', checkNotAuthenticated, async function (req, res) {
        const email:string = req.body.email.toLowerCase();
        const password:string = req.body.password;
        const password2:string = req.body.password2;
        const token_val:string = req.body.token;

        let error = User.validatePassword(password, password2);
        if (error != null) {
            (req.session as any).myinfo = { error };
            (req.session as any).fields = req.body;
            res.redirect(`/pwnew?token=${token_val}`);
            return;
        }

        const user = await config.dataSource.getRepository(User)
            .createQueryBuilder('user')
            .select([
                'user.id',
                'user.email',
                'user.password',
                'user.confirmed'
            ])
            .where('user.email = :email', { email })
            .getOne();

        let token: Token;
        if (user == null || !(await Token.validate(config.dataSource, token_val, user.id, t => token = t))) {
            (req.session as any).myinfo = { error: 'Error: The link is no longer valid! please request another email.' };
            (req.session as any).fields = req.body;
            res.redirect(`/pwreset`);
            return;
        }

        //success
        try {
            const hashPwd = await bcrypt.hash(password, 10);
            
            user.password = hashPwd;
            user.confirmed = true; //since user received email to get to this stage if not confirmed already.
            await user.save();
            token!.remove(); //async

            (req.session as any).myinfo = {info: 'Password changed successfully!'};
            (req.session as any).fields = req.body;
            res.redirect('/login');
            return;
        }
        catch (err) {

            console.log(err);
            (req.session as any).myinfo = {error: 'Error: Something has gone wrong, please try again!'};
            (req.session as any).fields = req.body;
            res.redirect('/register');
            return;
        }
    });

    router.post('/login', checkNotAuthenticated, config.passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/login'
    }));

    router.post('/logout', checkAuthenticated, function (req, res, next) {
        req.logOut(function(err) {
            if (err) return next(err);
            (req.session as any).myinfo = { info: 'You have successfully logged out!' };
            res.redirect('/login');
        });
    });

    return router;
}
