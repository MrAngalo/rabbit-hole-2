import express from "express";
import { Request, Response } from "express-serve-static-core";
import { JSONResponse, redirectJSON } from "../middleware";
import { Scene, SceneStatus } from "../../entities/Scene";
import { DataSource } from "typeorm";

export function adminModifyRouter(config:{dataSource: DataSource}) {
    const router = express.Router();

    router.post('/modify/scene/:id(\\d+)', redirectJSON({
        logic: (req, res) => adminModifySceneJSON(req, res, config),
        displaySuccessInfo: true
    }));

    return router;
}

export async function adminModifySceneJSON(req: Request, res: Response, config: {dataSource: DataSource}) : Promise<JSONResponse> {
    const sceneId:number = parseInt(req.params.id);
    const status = SceneStatus[req.body.status.toUpperCase() as keyof typeof SceneStatus];

    if (!Scene.exists(sceneId))
        return { code: 400, error: `Scene id=${sceneId} does not exist or has been removed`, redirect: '/' };

    if (status == undefined)
        return { code: 400, error: `Status ${req.body.status.toUpperCase()} is unknown!`, redirect: `/scene/${sceneId}` };

    const scene = await config.dataSource.getRepository(Scene)
      .createQueryBuilder('scene')
      .select(['scene.id','scene.status'])
      .where('scene.id = :id', { id: sceneId })
      .getOne() as Scene; //always exists

    if (scene.status == status) {
        return { code: 200, info: `Scene id=${sceneId} already has status ${SceneStatus[status]}!`, redirect: `/scene/${sceneId}`};
    }

    //success
    scene.status = status;
    await scene.save();

    return { code: 200, info: `Successfully changed status of Scene id=${sceneId} to ${SceneStatus[status]}`, redirect: `/scene/${sceneId}`};
}
