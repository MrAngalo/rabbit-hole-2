import express from "express";
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { DataSource } from "typeorm";
import { PassportStatic } from "passport";
import { authenticateUserJSON, registerUserJSON,} from "../auth/authUserRouter";
import { newPasswordJSON, requestPasswordResetEmailJSON, requestVerificationEmailJSON} from "../auth/authMailerRouter";
import { ApiKey } from "../../entities/ApiKey";
import { User } from "../../entities/User";
import { ApiUserToken } from "../../entities/ApiUserToken";
import { checkUserToken, errApiKey, errUnknown } from "./apiMiddleware";
import { Request, Response } from "express-serve-static-core";
import { JSONResponse } from "../middleware";

export function apiAuthRouter(config:{ dataSource: DataSource, passport: PassportStatic }) {
    
    const router = express.Router();

    router.post('/api/register', async function (req, res) {
        const json = await registerUserJSON(req, res, config);
        res.status(json.code).json(json);
    });

    router.post('/api/verify', async function (req, res) {
        const json = await requestVerificationEmailJSON(req, res, config);
        res.status(json.code).json(json);
    });

    router.post('/api/pwreset', async function (req, res) {
        const json = await requestPasswordResetEmailJSON(req, res, config);
        res.status(json.code).json(json);
    });

    router.post('/api/pwnew', async function (req, res) {
        const json = await newPasswordJSON(req, res, config);
        res.status(json.code).json(json);
    });
    //uses ApiUserToken system
    router.post('/api/login', async function (req, res) {
        const json = await apiAuthenticateUserJSON(req, res, config);
        res.status(json.code).json(json);
    });
    //uses ApiUserToken system
    router.post('/api/logout', checkUserToken(config), async function (req, res) {
        const json = await apiDeauthenticateUserJSON(req, res, config);
        res.status(json.code).json(json);
    });
    
    return router;
}

async function apiAuthenticateUserJSON(req: Request, res: Response, config: { dataSource: DataSource, passport: PassportStatic }) : Promise<JSONResponse> {
    const email:string|undefined = req.body.email;
    const password:string|undefined = req.body.password;
    if (email == undefined || password == undefined) {
        return { code: 400, error: errApiKey, redirect: '/login' };
    }
    const json = await authenticateUserJSON(req, email, password, config);
    if (json.code == 400) {
        return json;
    }
    const apikey:ApiKey = (req as any).apikey;
    const user:User = json.response.user;

    //delete old tokens
    await config.dataSource.getRepository(ApiUserToken)
        .createQueryBuilder()
        .delete()
        .from(ApiUserToken)
        .where("apikeyId = :api", { api: apikey.id })
        .andWhere("userId = :user", { user: user.id })
        .execute();

    try {
        //user id is used to query the user later
        const token = user.id+'-'+crypto.randomBytes(16).toString('hex');
        const hashToken = await bcrypt.hash(token, 10);
        const apiUserToken = ApiUserToken.create({
            apikey: apikey,
            user: user,
            value: hashToken,
        });
        await apiUserToken.save();

        //redacted response
        return { code: 200, info: json.info, response: { token, user: { username: user.username }}, redirect: '/' };

    } catch (err) { //should never happen
        console.log();
        console.log(err);
        return { code: 400, error: errUnknown, redirect: '/login' };
    }
}


async function apiDeauthenticateUserJSON(req: Request, res: Response, config: { dataSource: DataSource }) : Promise<JSONResponse> {
    const apikey:ApiKey = (req as any).apikey;
    const userid = (req as any).userid;

    //delete old tokens
    await config.dataSource.getRepository(ApiUserToken)
        .createQueryBuilder()
        .delete()
        .from(ApiUserToken)
        .where("apikeyId = :api", { api: apikey.id })
        .andWhere("userId = :user", { user: userid })
        .execute();

    const json:JSONResponse = { code: 200, info: "User Successfully logged out.", redirect: '/'};
    return json
}
