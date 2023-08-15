import express from "express";
import { DataSource } from "typeorm";
import { checkUserToken } from "./apiMiddleware";
import { JSONResponse } from "../middleware";
import { createSceneJSON } from "../scene/createScene";
import { fetchSceneJSON } from "../scene/fetchScene";
import { rateSceneJSON } from "../scene/rateScene";
import { Scene } from "../../entities/Scene";

export function apiSceneRouter(config:{ dataSource: DataSource }) {
    
    const router = express.Router();

    router.post('/total/', async function (req, res) {
        const response = { scene_count: Scene.scene_count, last_id: Scene.last_id };
        const json:JSONResponse = { code: 200, info: 'Success', response, redirect: ''};
        res.status(json.code).json(json);
    });

    router.post('/scene/:id(\\d+)', async function (req, res) {
        const json = await fetchSceneJSON(req, res, config);
        res.status(json.code).json(json);
    });

    router.get('/create/:id(\\d+)', checkUserToken(config), async function(req, res) {
        const json = await createSceneJSON(req, res, config);
        res.status(json.code).json(json);
    });

    router.post('/rate/:id(\\d+)', checkUserToken(config), async function (req, res) {
        const json = await rateSceneJSON(req, res, config);
        res.status(json.code).json(json);
    });
    
    return router;
}