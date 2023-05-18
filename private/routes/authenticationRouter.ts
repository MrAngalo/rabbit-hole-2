import express, { RequestHandler } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { PassportStatic } from 'passport';
import { checkAuthenticated, checkNotAuthenticated } from './middleware';
import { validateRegistration } from '../utils/validator';
import { User } from '../entities/User';
import { Token } from '../entities/Token'
import { DataSource } from 'typeorm';

module.exports = authenticationRouter
export = authenticationRouter;

const router = express.Router();
function authenticationRouter(config:{dataSource: DataSource, passport: PassportStatic}) {
    
    router.get('/login', checkNotAuthenticated, function (req, res) {
        res.render("login", {csrfToken: req.csrfToken()});
    });

    router.get('/register', checkNotAuthenticated, function (req, res) {
        res.render("register", {csrfToken: req.csrfToken()});
    });

    router.get('/account', checkAuthenticated, function (req, res) {
        res.render("account", {csrfToken: req.csrfToken()});
    });

    router.get('/logout', function (req, res) {
        res.redirect('/account');
    });

    router.post('/register', checkNotAuthenticated, async function (req, res) {
        const username:string = req.body.username;
        const email:string = req.body.email;
        const rawPwd:string = req.body.password;

        var error = await validateRegistration(config.dataSource, username, email, rawPwd);
        if (error != null) {
            (req.session as any).myinfo = { error };
            (req.session as any).fields = req.body;
            res.redirect('/register');
            return;
        }

        try {
            const hashPwd = await bcrypt.hash(rawPwd, 10);
            const user = User.create({
                username: username,
                username_lower: username.toLowerCase(),
                email: email.toLowerCase(),
                password: hashPwd
            });
            await user.save();

            // const token = Token.create({
            //     owner: user,
            //     value: crypto.randomBytes(32).toString('hex'),
            //     expires: 48*60*60*1000 // 48 hours to verify
            // })
            // await token.save();
            
            (req.session as any).myinfo = { info: 'Successfully created an account!' };
            res.redirect('/login');

        } catch (err) {
            console.log(err);
            (req.session as any).myinfo = {error: 'Error: Something has gone wrong, please try again!'};
            (req.session as any).fields = req.body;
            res.redirect('/register');
            return;
        }
    });

    router.post('/login', checkNotAuthenticated, config.passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/login',
        failureFlash: true
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
