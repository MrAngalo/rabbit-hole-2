import express from "express";
import { userdataJSON } from "../userRouter";
import { checkUserToken } from "./apiMiddleware";
import { DataSource } from "typeorm";
import { JSONResponse } from "../middleware";

export function apiUserRouter(config:{ dataSource: DataSource }) {
    
    const router = express.Router();
    
    router.post('/api/user/:username', async function (req, res) {
        const json = await userdataJSON(req, res, config);
        res.status(json.code).json(json);
    });

    router.post('/api/account', checkUserToken(config), async function (req, res) {
        //TODO: Add information about logged in user
        const json: JSONResponse = { code: 200, info: 'Success', redirect: '/account' }
        res.status(json.code).json(json);
    });    
    
    return router;
}
