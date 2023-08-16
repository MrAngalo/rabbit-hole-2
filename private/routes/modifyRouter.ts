import express from "express";
import { Request, Response } from "express-serve-static-core";
import { JSONResponse, checkAuthenticated, redirectJSON } from "./middleware";
import { DataSource } from "typeorm";
import { User } from "../entities/User";

export function modifyRouter(config:{dataSource: DataSource}) {
    const router = express.Router();

    router.post('/modify/usersettings/:username', checkAuthenticated, async function (req, res) {
        res.type('application/json');
        const json = await modifyUserSettingsJSON(req, res, config);
        return res.status(json.code).json(json);
    });

    return router;
}

export async function modifyUserSettingsJSON(req: Request, res: Response, config: {dataSource: DataSource}) : Promise<JSONResponse> {
    const username = req.params.username.toLowerCase();
    const user = req.user as User;

    if (user.username.toLowerCase() != username) {
        return { code: 400, error: `You cannot modify the settings of ${username}!`, redirect: '/account'}
    }

    const viewarev:boolean = req.body.viewarev != undefined;

    console.log(viewarev);

    return { code: 200, info: `Success`, redirect: '/account'};
}
