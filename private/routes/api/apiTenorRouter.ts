import express from "express";
import { tenorFindJSON, tenorSearchJSON } from "../tenorRouter";

export function apiTenorRouter(config:{ Tenor: any }) {
    
    const router = express.Router();
    
    router.post('/api/tenor/find', async function (req, res) {
        const json = await tenorFindJSON(req, res, config);
        res.status(json.code).json(json);
    });

    router.post('/api/tenor/search', async function (req, res) {
        const json = await tenorSearchJSON(req, res, config);
        res.status(json.code).json(json);
    });
    
    return router;
}