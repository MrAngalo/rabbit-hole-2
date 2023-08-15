import express from "express";
import { JSONResponse } from "../middleware";
import { guidelines } from "../guidelinesRouter";

export function apiGuidelinesRouter() {
    
    const router = express.Router();

    router.post('/guidelines', async function (req, res) {
        const json:JSONResponse = {code: 200, info: 'Success!', redirect: '/', response: guidelines}
        res.status(json.code).json(json);
    });
    
    return router;
}