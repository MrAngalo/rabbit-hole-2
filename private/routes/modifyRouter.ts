import express from "express";
import { Request, Response } from "express-serve-static-core";
import { JSONResponse, checkAuthenticated, redirectJSON } from "./middleware";
import { DataSource } from "typeorm";
import { User } from "../entities/User";

export function modifyRouter(config:{dataSource: DataSource}) {
    const router = express.Router();

    router.use(checkAuthenticated);

    router.post('/modify/usersettings/:username', async function (req, res) {
        res.type('application/json');
        const json = await modifyUserSettingsJSON(req, res, config);
        return res.status(json.code).json(json);
    });

    return router;
}

export async function modifyUserSettingsJSON(req: Request, res: Response, config: {dataSource: DataSource}) : Promise<JSONResponse> {
    const username = req.params.username;
    const user = req.user as User;

    if (user.username.toLowerCase() != username.toLowerCase()) {
        return { code: 400, error: `You cannot modify the settings of ${username}!`, redirect: '/account'}
    }

    const gifId:string = req.body.gifId;
    const bio:string = req.body.bio;
    const viewarev:boolean = req.body.viewarev != undefined;

    user.ppf_gifId = gifId;
    user.bio = bio.substring(0, 400);
    user.view_await_review = viewarev;
    await user.save();

    return { code: 200, info: `Successfully modified the user settings of ${username}`, redirect: '/account'};
}
