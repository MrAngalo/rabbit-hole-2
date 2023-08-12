import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { PassportStatic } from 'passport';
import { checkAuthenticated, checkNotAuthenticated, JSONResponse, redirectJSON } from '../middleware';
import { User } from '../../entities/User';
import { Token, TokenType } from '../../entities/Token'
import { sendVerificationEmail } from '../../config/mailer';
import { Request, Response } from 'express-serve-static-core';
import { errUnknown } from '../api/apiMiddleware';

export function authUserRouter(config:{dataSource: DataSource, passport: PassportStatic}) {
    
    const router = express.Router();

    /*
    * GET REQUESTS
    */
    router.get('/login', checkNotAuthenticated, function (req, res) {
        //from verification emails
        let token = (req.query.token != undefined) ? req.query.token+'' : null;
        res.render("auth/login", {css: ['auth/layout'], csrfToken: req.csrfToken(), token });
    });

    router.get('/register', checkNotAuthenticated, function (req, res) {
        res.render("auth/register", {css: ['auth/layout'], csrfToken: req.csrfToken()});
    });

    router.get('/logout', function (req, res) {
        res.redirect('/account');
    });

    /*
    * POST REQUESTS
    */
    router.post('/register', checkNotAuthenticated, redirectJSON({
        logic: (req, res) => registerUserJSON(req, res, config),
        saveFieldsOnFail: true,
        displaySuccessInfo: true,
    }));

    //uses passport system, local strategy is a wrapper for authenticateUserJSON() configured in passport-config.ts
    router.post('/login', checkNotAuthenticated, config.passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/login'
    }));

    //uses passport system
    router.post('/logout', checkAuthenticated, function (req, res, next) {
        req.logOut(function(err) {
            if (err) return next(err);
            (req.session as any).myinfo = { info: 'You have successfully logged out!' };
            res.redirect('/login');
        });
    });

    return router;
}

export async function authenticateUserJSON(req: Request, email: string, password: string, config: {passport:PassportStatic, dataSource: DataSource}) : Promise<JSONResponse> {
    const user = await config.dataSource.getRepository(User)
        .createQueryBuilder('user')
        .select([
            'user.id',
            'user.email',
            'user.username', //not needed for this function, but good utility for dependents
            'user.password',
            'user.confirmed',
            'user.permission'
        ])
        .where('user.email = :email', { email })
        .getOne();

    if (user == null)
        return { code: 400, error: 'There is no user with that email', redirect: '/login' };

    if (!(await bcrypt.compare(password, user.password)))
        return { code: 400, error: 'Your password is incorrect', redirect: '/login' };

    if (!user.confirmed && !(await Token.validate(config.dataSource, req.body.token, user.id, tokenSuccessCB)))
        return { code: 400, error: 'You must verify your email first', redirect: '/login' };

    //only executes for those who are not confirmed
    function tokenSuccessCB(token: Token) {
        user!.confirmed = true;
        user!.save(); //async
        token.remove(); //async
    }

    return { code: 200, info: `Welcome ${user.username}!`, response: { user }, redirect: '/'};
}

export async function registerUserJSON (req: Request, res: Response, config:{ dataSource: DataSource }) : Promise<JSONResponse> {
    //the values bellow can be undefined, but they are resolved on the first error check
    const username:string = req.body.username;
    const email:string = (req.body.email) ? req.body.email.toLowerCase() : undefined;
    const password:string = req.body.password;
    const password2:string = req.body.password2;

    if (password != password2)
        return { code: 400, error: 'Passwords do not match!', redirect: '/register' };

    let error = User.validateEmail(email) ||
                User.validateUsername(username) ||
                User.validatePassword(password);

    if (error != null)
        return { code: 400, error, redirect: '/register' };

    const doppelganger = await config.dataSource.getRepository(User)
        .createQueryBuilder('user')
        .select([ 'user.id' ])
        .where('user.username_lower = :u', { u: username.toLowerCase() })
        .orWhere('user.email = :e', { e: email })
        .getOne();
      
    if (doppelganger != null)
        return { code: 400, error: 'There is already an account associated with the email or username', redirect: '/register' };

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

        return { code: 200, info: 'Successfully created an account! Please verify your email before loggin in.', redirect: '/login' };

    } catch (err) {
        console.log();
        console.log(err);
        return { code: 400, error: errUnknown, redirect: '/register' };
    }
}