import bcrypt from 'bcrypt';
import { NextFunction } from "express";
import { Request, Response } from "express-serve-static-core";
import { DataSource } from 'typeorm';
import { ApiKey } from '../../entities/ApiKey';
import { ApiUserToken } from '../../entities/ApiUserToken';
import { JSONResponse } from "../middleware";

//common responses
export const errApiKey:string = 'Invalid or Missing API Key';
export const errUserToken:string = 'Invalid or Missing User Token';
export const errParam:string = 'Invalid or Missing Parameter';
export const errUnknown:string = "Unknown error occured, contact admin.";

export function checkApiKey(config:{dataSource:DataSource}) {
    return async function (req: Request, res: Response, next: NextFunction) {
        res.type('application/json');
        const key:string|undefined = req.body.key;

        if (key == undefined) {
            const response:JSONResponse = {code: 400, error: errApiKey, redirect: '/'};
            res.status(400).json(response);
            return;
        } 
        const apikey = await config.dataSource.getRepository(ApiKey)
            .createQueryBuilder('key')
            .select(['key.id','key.value'])
            .where('key.value = :key', { key })
            .getOne();
        if (apikey == null) {
            const response:JSONResponse = {code: 400, error: errApiKey, redirect: '/'};
            res.status(400).json(response);
            return;
        }
        //payload
        (req as any).apikey = apikey;
        next();
    }
}

export function checkUserToken(config: {dataSource: DataSource}) {
    return async function(req:Request, res:Response, next: NextFunction) {
        const token:string|undefined = req.body.user;
        if (token == undefined) {
            const response:JSONResponse = {code: 400, error: errUserToken, redirect: '/'};
            res.status(400).json(response);
            return;
        }
        const apikey:ApiKey = (req as any).apikey;
        const userid = token.split('-')[0]; //extracts userid from token
        if (Number.isNaN(parseInt(userid))) {
            const response:JSONResponse = {code: 400, error: errUserToken, redirect: '/'};
            res.status(400).json(response);
            return;
        }

        const usertoken = await config.dataSource.getRepository(ApiUserToken)
            .createQueryBuilder('usertoken')
            .select(['usertoken.id', 'usertoken.value'])
            .where('usertoken.apikeyId = :api', { api: apikey.id })
            .andWhere('usertoken.userId = :user', { user: userid })
            .andWhere('usertoken.expires > now()')
            .getOne();
        if (usertoken == undefined || !(await bcrypt.compare(token, usertoken.value))) {
            const response:JSONResponse = {code: 400, error: errUserToken, redirect: '/'};
            res.status(400).json(response);
            return;
        }
        //payload
        (req as any).userid = userid;
        next();
    }
}