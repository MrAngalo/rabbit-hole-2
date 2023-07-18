import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { PassportStatic } from 'passport';
import { checkNotAuthenticated, JSONResponse, redirectJSON } from '../middleware';
import { Brackets, DataSource } from 'typeorm';
import { User } from '../../entities/User';
import { Token, TokenType } from '../../entities/Token'
import { sendResetPasswordEmail, sendVerificationEmail } from '../../config/mailer';
import { Request, Response } from 'express-serve-static-core';

export function authMailerRouter(config:{dataSource: DataSource, passport: PassportStatic}) {
    
    const router = express.Router();
    
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

    router.post('/verify', checkNotAuthenticated, redirectJSON({
        logic: (req, res) => requestVerificationEmailJSON(req, res, config),
        displaySuccessInfo: true,
    }));

    router.post('/pwreset', checkNotAuthenticated, redirectJSON({
        logic: (req, res) => requestPasswordResetEmailJSON(req, res, config),
        saveFieldsOnFail: true,
        displaySuccessInfo: true,
    }));
    
    router.post('/pwnew', checkNotAuthenticated, redirectJSON({
        logic: (req, res) => newPasswordJSON(req, res, config),
        saveFieldsOnFail: true,
        displaySuccessInfo: true,
    }));

    return router;
}

//only resends email verification token via email, validation occurs in authenticateUserJSON
export async function requestVerificationEmailJSON(req: Request, res: Response, config: { dataSource: DataSource}) : Promise<JSONResponse> {
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
    if (user == null || user.confirmed)
        return { code: 200, info: 'If the email exists in the system, a verification email will be sent shortly.', redirect: '/login' };

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
        if (spamTokens.length > 0)
            return { code: 400, error: 'You already requested a verification email! Please wait 5 minutes.' , redirect: '/verify' };
        
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

    return { code: 200, info: 'If the email exists in the system, a verification email will be sent shortly.', redirect: '/login' };
};

//only sends reset password token via email, password reset occurs in pwnew 
export async function requestPasswordResetEmailJSON(req: Request, res: Response, config: { dataSource: DataSource}) : Promise<JSONResponse> {
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
    if (user == null)
        return { code: 200, info: 'If the email exists in the system, a password reset email will be sent shortly.', redirect: '/pwreset' };

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
        if (spamTokens.length > 0)
            return { code: 400, error: 'You already requested a password reset email! Please wait 5 minutes.', redirect: '/pwreset' };
        
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
    return { code: 200, info: 'If the email exists in the system, a password reset email will be sent shortly.', redirect: '/login' };
};

export async function newPasswordJSON(req: Request, res: Response, config: { dataSource: DataSource}) : Promise<JSONResponse> {
    const email:string = req.body.email.toLowerCase();
    const password:string = req.body.password;
    const password2:string = req.body.password2;
    const token_val:string = req.body.token;

    if (password != password2)
        return { code: 400, error: 'Passwords do not match!', redirect: `/pwnew?token=${token_val}`}

    let error = User.validatePassword(password);
    if (error != null)
        return { code: 400, error, redirect: `/pwnew?token=${token_val}`};

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
    if (user == null || !(await Token.validate(config.dataSource, token_val, user.id, t => token = t)))
        return { code: 400, error: 'Error: The link is no longer valid! please request another link.', redirect: '/pwreset' };

    //success
    try {
        const hashPwd = await bcrypt.hash(password, 10);
        user.password = hashPwd;
        user.confirmed = true; //since user received email to get to this stage if not confirmed already.
        await user.save();
        token!.remove(); //async

        return { code: 200, info: 'Password changed successfully!', redirect: '/login'};
    }
    catch (err) {
        console.log();
        console.log(err);
        return { code: 400, error: 'Something has gone wrong, please try again!', redirect: `/pwnew?token=${token_val}`};
    }
};