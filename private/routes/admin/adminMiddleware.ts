import { NextFunction } from "express";
import { Request, Response } from "express-serve-static-core";
import { User, UserPremission } from '../../entities/User';

export function checkAuthenticatedAdmin(req:Request, res:Response, next: NextFunction) {
    const user = req.user as User;
    if (user != undefined && user.permission >= UserPremission.ADMINISTRATOR)
        return next();

    (req.session as any).myinfo = { warn: `You don't have enough permissions to be here!` };
    res.redirect('/');
}