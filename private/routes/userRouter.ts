import express from "express";
import { DataSource } from "typeorm";
import { Request, Response } from "express-serve-static-core";
import { checkAuthenticated } from "./middleware";
import { User, UserPremission } from "../entities/User";
import { JSONResponse } from "./middleware";

export function userRouter(config:{dataSource: DataSource}) {
    
    const router = express.Router();
    router.get('/account', checkAuthenticated, async function (req, res) {
        const user = req.user as User;
        res.redirect(`/user/${user.username.toLowerCase()}`);
    });

    router.get('/user/:username', async function (req, res) {
        const json = await userdataJSON(req, res, config);
        if (json.code == 400) {
            (req.session as any).myinfo = { error: json.error }
            res.redirect(`/`);
            return; 
        }
        json.response.UserPremission = UserPremission;
        json.response.csrfToken = req.csrfToken();
        res.render("userpage", json.response);
    });

    return router;
};

export async function userdataJSON (req:Request, res:Response, config:{dataSource: DataSource}) : Promise<JSONResponse> {
    const username = req.params.username.toLowerCase();
    const user = req.user as User;
    let properties = [
        'user.id',
        'user.username',
        'user.permission',
        'user.created',
        'user.bio',
        'user.ppf_gifId',
        'scenes.id',
        'scenes.title',
        'scenes.gifId'
    ];
    if (user != undefined && username == user.username.toLowerCase()) {
        properties.push(
            'user.view_await_review',
        );
    }

    const user2 = await config.dataSource.getRepository(User)
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.scenes', 'scenes')
        .select(properties)
        .where('user.username_lower = :u', { u: username.toLowerCase() })
        .orderBy('scenes.id', 'DESC')
        .getOne();
    
    if (user2 == null) {
        return {code: 400, error: `The user "${username}" does not exist or was removed!`, redirect: '/' };
    }
    return {code: 200, info: 'Success', response: { user2 }, redirect: `/user/${username}` }
}