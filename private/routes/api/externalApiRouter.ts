import express, { NextFunction } from "express";
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { DataSource } from "typeorm";
import { PassportStatic } from "passport";
import { guidelines } from "../guidelinesRouter";
import { fetchSceneJSON } from "../scene/fetchScene";
import { userdataJSON } from "../user/userRouter";
import { authenticateUserJSON } from "../auth/authRouter";
import { ApiKey } from "../../entities/ApiKey";
import { Scene } from "../../entities/Scene";
import { User } from "../../entities/User";
import { ApiUserToken } from "../../entities/ApiUserToken";
import { JSONResponse } from "../../util/types";
import { Request, Response } from "express-serve-static-core";

export function externalApiRouter(config:{dataSource: DataSource, passport: PassportStatic, Tenor: any}) {
    //common responses
    const errApiKey:JSONResponse = { code: 400, error: 'Invalid or Missing API Key'};
    const errUserToken:JSONResponse = { code: 400, error: 'Invalid or Missing User Token'};
    const errParam:JSONResponse = { code: 400, error: 'Invalid or Missing Parameter'};
    
    const router = express.Router();

    /*
    Middleware
    */
    async function checkApiKey(req: Request, res: Response, next: NextFunction) {
        res.type('application/json');
        const key:string|undefined = req.body.key;

        if (key == undefined) {
            res.status(400).json(errApiKey);
            return;
        } 
        const apikey = await config.dataSource.getRepository(ApiKey)
            .createQueryBuilder('key')
            .select(['key.id','key.value'])
            .where('key.value = :key', { key })
            .getOne();
        if (apikey == null) {
            res.status(400).json(errApiKey);
            return;
        }
        //payload
        (req as any).apikey = apikey;
        next();
    }

    async function checkUserToken(req:Request, res:Response, next: NextFunction) {
        const token:string|undefined = req.body.user;
        if (token == undefined) {
            res.status(400).json(errUserToken);
            return;
        }
        const apikey:ApiKey = (req as any).apikey;
        const userid = token.split('-')[0]; //extracts userid from token
        if (Number.isNaN(parseInt(userid))) {
            res.status(400).json(errUserToken);
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
            res.status(400).json(errUserToken);
            return;
        }
        //payload
        (req as any).userid = userid;
        next();
    }

    /*
    All
    */
    router.use(checkApiKey);
    
    /*
    Authentication
    */
    router.post('/api/testuser', checkUserToken, async function (req, res) {
        const response:JSONResponse = { code: 200, response: "success" }
        res.status(200).json(response);
    });
    router.post('/api/register', async function (req, res) {});
    router.post('/api/verify', async function (req, res) {});
    router.post('/api/pwreset', async function (req, res) {});
    router.post('/api/pwnew', async function (req, res) {});
    router.post('/api/login', async function (req, res) {
        const email:string|undefined = req.body.email;
        const password:string|undefined = req.body.password;

        if (email == undefined || password == undefined) {
            res.status(400).json(errApiKey);
            return;
        }
        const json = await authenticateUserJSON(req, email, password, config);
        if (json.code == 400) {
            res.status(json.code).json(json);
            return;
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
            const response = {
                token,
                user: { username: user.username }
            }
            const result:JSONResponse = { code: 200, response };
            res.status(result.code).json(result);
            return;

        } catch (err) { //should never happen
            console.log();
            console.log(err);
            const result:JSONResponse = { code: 400, error: "Unknown error occured, contact admin." };
            res.status(result.code).json(result);
            return;
        }
    });
    router.post('/api/logout', checkUserToken, async function (req, res) {
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

        const result:JSONResponse = { code: 200, response: "User Successfully logged out." };
        res.status(result.code).json(result);
    });

    /*
    Scene
    */
    router.post('/api/total/', async function (req, res) {
        const response = {
            scene_count: Scene.scene_count,
            last_id: Scene.last_id
        };
        const json:JSONResponse = { code: 200, response };
        res.status(json.code).json(json);
    });
    router.post('/api/scene/:id(\\d+)', async function (req, res) {
        const json = await fetchSceneJSON(req, res, config);
        res.status(json.code).json(json);
    });
    router.post('/api/create/:id(\\d+)', async function (req, res) {});
    router.post('/api/rate/:id(\\d+)', async function (req, res) {});

    /*
    User
    */
    router.post('/api/user/:username', async function (req, res) {
        const json = await userdataJSON(req, res, config);
        res.status(json.code).json(json);
    });
    router.post('/api/account', async function (req, res) {});

    /*
    Tenor
    */
    router.post('/api/tenor/find', async function (req, res) {
        const id:string|undefined = req.body.id;
        
        if (id == undefined) {
            res.status(400).json(errParam);
            return;
        }
        config.Tenor.Search.Find(id.split(',').splice(0, 50)).then((results:any) => {
            res.status(200).json({ code: 200, results });
        }).catch((e:Error) => {
            console.log("");
            console.log(e);
            res.status(400).json({ code: 400, error: e.message });
        });
    });

    router.post('/api/tenor/search', async function (req, res) {
        const query:string|undefined = req.body.query;
        const limit:number = (req.body.limit != undefined) ? parseInt(req.body.limit) : 30;
        
        if (query == undefined || Number.isNaN(limit)) {
            res.status(400).json(errParam);
            return;
        }
        config.Tenor.Search.Query(query, Math.max(Math.min(limit, 50), 0)).then((results:any) => {
            res.status(200).json({ code: 200, results });
        }).catch((e:Error) => {
            console.log("");
            console.log(e);
            res.status(400).json({ code: 400, error: e.message })
        });
    });

    /*
    Guidelines
    */
    router.post('/api/guidelines', async function (req, res) {
        res.status(200).json({ results: guidelines });
    });
    
    return router;
}

