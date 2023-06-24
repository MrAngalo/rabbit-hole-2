import { NextFunction, Request, Response } from 'express';
import moment from 'moment';
import { Scene } from '../entities/Scene';

let middlewares = { configLocals, checkAuthenticated, checkNotAuthenticated, handleErrors};
module.exports = middlewares;
export = middlewares;

type RenderFunction = (view: string, options?: object, fn?: (err: Error, html: string) => void) => void;

function configLocals() {
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

            old_render(view, options, fn);

        } as RenderFunction;

        next();
    }
}

function checkAuthenticated(req:Request, res:Response, next: NextFunction) {
    if (req.isAuthenticated())
        return next();

    (req.session as any).myinfo = { warn: 'Warning: You must be logged in to do this!' };
    res.redirect('/login');
}

function checkNotAuthenticated(req:Request, res:Response, next: NextFunction) {
    if (!req.isAuthenticated())
        return next();
        
    (req.session as any).myinfo = { warn: 'Warning: You are no longer logged in!' };
    res.redirect('/');
}

function handleErrors(err:Error,req:Request,res:Response,next:NextFunction) {
    if(!err)
        return next();
        
    console.log("");
    console.log("Error trying to access route: " + req.originalUrl);
    console.log(err.stack);

    res.send("Something Went Wrong");
    //  return res.redirect(301, 'error.html');
}
