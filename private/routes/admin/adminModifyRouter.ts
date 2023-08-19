import express from "express";
import { Request, Response } from "express-serve-static-core";
import { JSONResponse, redirectJSON } from "../middleware";
import { Scene, SceneStatus } from "../../entities/Scene";
import { DataSource } from "typeorm";
import { User, UserPremission } from "../../entities/User";

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
        .leftJoinAndSelect('scene.creator', 'creator')
        .select([
            'scene.id',
            'scene.status',
            'creator.id',
            'creator.permission'
        ])
        .where('scene.id = :id', { id: sceneId })
        .getOne() as Scene; //always exists

    if (scene.status == status) {
        return { code: 200, info: `Scene id=${sceneId} already has status ${SceneStatus[status]}!`, redirect: `/scene/${sceneId}`};
    }

    //success
    scene.status = status;
    await scene.save();

    //TODO: send creator notification about scene status change

    //this automatically upgrade user's permissions once they reach 5 public scenes
    if (scene.creator.permission == UserPremission.VISITOR) {
        
        const countPublic = await config.dataSource.getRepository(Scene)
            .createQueryBuilder('scene')
            .where('scene.status = :status', {status: SceneStatus.PUBLIC})
            .andWhere('scene.creatorId = :id', {id: scene.creator.id})
            .getCount();
        
        if (countPublic >= 5) {
            scene.creator.permission = UserPremission.TRUSTED;
            scene.creator.save();

            //TODO: send creator notification about permission upgrade
        }
    }

    return { code: 200, info: `Successfully changed status of Scene id=${sceneId} to ${SceneStatus[status]}`, redirect: `/scene/${sceneId}`};
}
