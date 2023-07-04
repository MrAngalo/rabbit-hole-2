import express from "express";
import { DataSource } from "typeorm";
import { guidelines } from "../guidelinesRouter";
import { ApiKey } from "../../entities/ApiKey";
import { Scene } from "../../entities/Scene";
import { JSONResponse } from "../../util/types";
import { fetchSceneJSON } from "../scene/fetchScene";
import { userdataJSON } from "../user/userRouter";

export function externalApiRouter(config:{dataSource: DataSource, Tenor: any}) {
    
    const router = express.Router();
    const errApiKey:JSONResponse = { code: 400, error: 'Invalid or Missing API Key'};
    const errParam:JSONResponse = { code: 400, error: 'Invalid or Missing Parameter'};

    /*
    All
    */
    //middleware to check if api key is valid
    router.use(async function (req, res, next) {
        res.type('application/json');
        const key:string|undefined = req.body.key;

        if (key == undefined) {
            res.status(400).json(errApiKey);
            return;
        } 
        const apikey = await config.dataSource.getRepository(ApiKey)
            .createQueryBuilder('key')
            .select(['key.value'])
            .where('key.value = :key', { key })
            .getOne();
        if (apikey == null) {
            res.status(400).json(errApiKey);
            return;
        }
        next();
    });

    /*
    Authentication
    */
    router.post('/api/register', async function (req, res) {});
    router.post('/api/verify', async function (req, res) {});
    router.post('/api/pwreset', async function (req, res) {});
    router.post('/api/pwnew', async function (req, res) {});
    router.post('/api/login', async function (req, res) {});
    router.post('/api/logout', async function (req, res) {});

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
