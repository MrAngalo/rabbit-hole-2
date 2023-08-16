import express from "express";
import  { Request, Response } from "express-serve-static-core";
import { JSONResponse } from "./middleware";

/* node_modules\tenorjs\src\Tools\Utilities.js */
const ErrorCode  = {
    ERR_REQ_SEND:`# [TenorJS] Could not send request`,
    ERR_RES_NOT: `# [TenorJS] Content received isn't JSON`,
    ERR_JSON_PARSE: `# [TenorJS] Failed to parse retrieved JSON.`,
    ERR_OTHER: `#####`
}

const ignoreErrorCodes = [ "ERR_REQ_SEND" ];

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
        return { code: 200, info: 'Success', redirect: '/', response };
    } catch (e) {
        const code = getErrorCode(e); //doing this because e.code does not work...
        if (!ignoreErrorCodes.includes(code)) {
            console.log(code);
            console.log(e);
        }
        return { code: 400, error: code, redirect: '/' };
    }
}

export async function tenorSearchJSON(req: Request, res: Response, config: {Tenor: any}) : Promise<JSONResponse> {
    let query:string = req.body.q as string || '';
    let limit:number = parseInt(req.body.limit) || 30;

    try {
        const response:any = await config.Tenor.Search.Query(query, Math.max(Math.min(limit, 50), 0));
        return { code: 200, info: 'Success', redirect: '/', response }
    } catch (e) {
        const code = getErrorCode(e); //doing this because e.code does not work :(
        if (!ignoreErrorCodes.includes(code)) {
            console.log(code);
            console.log(e);
        }
        return { code: 400, error: code, redirect: '/' };
    }
}

function getErrorCode(error:string) : string {
    for (const [name, value] of Object.entries(ErrorCode)) {
        if (error.includes(value))
            return name;
    }
    return ErrorCode.ERR_OTHER; //should never happen
}