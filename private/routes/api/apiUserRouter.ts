import express from "express";
import { userdataJSON } from "../userRouter";
import { DataSource } from "typeorm";

export function apiUserRouter(config:{ dataSource: DataSource }) {
    
    const router = express.Router();
    
    router.post('/user/:username', async function (req, res) {
        const json = await userdataJSON(req, res, config);
        res.status(json.code).json(json);
    });   
    
    return router;
}
