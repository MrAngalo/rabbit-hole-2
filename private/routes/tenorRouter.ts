import express from "express";
import  { Request, Response } from "express-serve-static-core";
import { JSONResponse } from "./middleware";

export function tenorRouter(config:{Tenor: any}) {

    const router = express.Router();
    router.post('/tenor/find', async function (req, res) {
        res.type('application/json');
        const json = await tenorFindJSON(req, res, config);
        return res.status(json.code).json(json);
    });

    router.post('/tenor/search', async function (req, res) {
        res.type('application/json');
        const json = await tenorSearchJSON(req, res, config);
        return res.status(json.code).json(json);
    });

    return router;
}

export async function tenorFindJSON(req: Request, res: Response, config: {Tenor: any}) : Promise<JSONResponse> {
    let id:string = req.body.id as string || '';

    try {
        const response:any = await config.Tenor.Search.Find(id.split(',').splice(0, 50));
        return { code: 200, info: 'Success', redirect: '/', response }
    } catch (e) {
        console.log("");
        console.log(e);
        return { code: 400, error: e, redirect: '/' }
    }
}

export async function tenorSearchJSON(req: Request, res: Response, config: {Tenor: any}) : Promise<JSONResponse> {
    res.type('application/json');

    let query:string = req.body.q as string || '';
    let limit:number = parseInt(req.body.limit) || 30;

    try {
        const response:any = await config.Tenor.Search.Query(query, Math.max(Math.min(limit, 50), 0));
        return { code: 200, info: 'Success', redirect: '/', response }
    } catch (e) {
        console.log("");
        console.log(e);
        return { code: 400, error: e, redirect: '/' }
    }
}
