import { NextFunction, Request, RequestHandler, Response } from 'express';
import moment from 'moment';
import { Scene } from '../entities/Scene';
import csrf from 'csurf';
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';

export function configLocals() {
    return function (req:Request, res:Response, next: NextFunction) {

        //injecting
        let old_render = res.render;
        
        res.render = function (view, options?, fn?) {
            // res.locals.filename = view.split('\\').pop()?.split('/').pop();
            res.locals.user = req.user;
            res.locals.moment = moment;
            res.locals.myinfo = (req.session as any).myinfo || req.flash();
            res.locals.fields = (req.session as any).fields || {};

            if (res.locals.css == undefined)
                res.locals.css = [view]; 

            res.locals.static = {
                scene_count: Scene.scene_count,
                last_id: Scene.last_id,
            };

            (req.session as any).myinfo = null;
            (req.session as any).fields = null;

            old_render(view, options, fn as any);
        }
        next();
    }
}

type ConditionalCSRFOpt = {
    value?: ((req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>) => string) | undefined;
    cookie?: boolean | csrf.CookieOptions | undefined;
    ignoreMethods?: string[] | undefined;
    sessionKey?: string | undefined;
    excludes?: RegExp[] | undefined;
}

export function conditionalCSRF(opt: ConditionalCSRFOpt) {
    const csrfMW = csrf(opt);
    if (opt.excludes == undefined)
        return csrfMW;

    return function (req:Request, res:Response, next: NextFunction) {
        for (let i = 0; i < opt.excludes!.length; i++) {
            if (opt.excludes![i].test(req.path)) {
                next();
                return;
            }
        }
        csrfMW(req, res, next);
    }
}

export function checkAuthenticated(req:Request, res:Response, next: NextFunction) {
    if (req.isAuthenticated())
        return next();

    (req.session as any).myinfo = { warn: 'Warning: You must be logged in to do this!' };
    res.redirect('/login');
}

export function checkNotAuthenticated(req:Request, res:Response, next: NextFunction) {
    if (!req.isAuthenticated())
        return next();
        
    (req.session as any).myinfo = { warn: 'Warning: You are no longer logged in!' };
    res.redirect('/');
}

export function handleErrors(err:Error,req:Request,res:Response,next:NextFunction) {
    if(!err)
        return next();
        
    console.log("");
    console.log("Error trying to access route: " + req.originalUrl);
    console.log(err.stack);

    res.send("Something Went Wrong");
    //  return res.redirect(301, 'error.html');
}
