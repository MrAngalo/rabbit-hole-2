import { NextFunction, Request, Response } from 'express';
import moment from 'moment';

var middlewares = { configLocals, checkAuthenticated, checkNotAuthenticated, handleErrors};
module.exports = middlewares;
export = middlewares;

function configLocals(config:{globals:any}) {
    return function (req:Request, res:Response, next: NextFunction) {

        (res as any).E6M5JTT6a8gaNZ = res.render;
        
        res.render = function (view: string, options?: object, fn?: (err: Error, html: string) => void) {
            res.locals.filename = view.split('\\').pop()?.split('/').pop();
            res.locals.user = req.user;
            res.locals.moment = moment;
            res.locals.globals = config.globals || {};
            res.locals.myinfo = (req.session as any).myinfo || req.flash();
            res.locals.fields = (req.session as any).fields || {};

            (req.session as any).myinfo = null;
            (req.session as any).fields = null;

            (res as any).E6M5JTT6a8gaNZ(view, options, fn)
        }

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
