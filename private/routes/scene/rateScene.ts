import express from "express";
import { Request, Response } from "express-serve-static-core";
import { JSONResponse, checkAuthenticated, redirectJSON } from "../middleware";
import { User } from "../../entities/User";
import { Scene } from "../../entities/Scene";
import { RatingType, SceneRating } from "../../entities/Rating";
import { DataSource } from "typeorm";

export function rateSceneRouter(config:{dataSource: DataSource}) {
    const router = express.Router();

    router.post('/rate/:id(\\d+)', checkAuthenticated, redirectJSON({
        logic: (req, res) => rateSceneJSON(req, res, config),
        displaySuccessInfo: true
    }));

    return router;
}

export async function rateSceneJSON(req: Request, res: Response, config: {dataSource: DataSource}) : Promise<JSONResponse> {
    const id:number = parseInt(req.params.id);
    const rating = RatingType[req.body.rating.toUpperCase() as keyof typeof RatingType];
    const user = req.user as User;

    if (!Scene.exists(id))
        return { code: 400, error: `Warning: Scene id=${id} does not exist or has been removed`, redirect: '/' };

    if (rating == undefined)
        return { code: 400, error: 'Warning: Rating type must be positive or negative!', redirect: `/scene/${id}` };

    //beginning of the day
    let today = new Date();
    today.setHours(0, 0, 0, 0);

    // [ { created, owner, scene }, ... ]
    const ratingsToday = await config.dataSource.getRepository(SceneRating)
        .createQueryBuilder('rating')
        .select([
            'rating.ownerId AS owner',
            'rating.sceneId AS scene',
            'rating.created AS created'
        ])
        .where('rating.created > :today', { today })
        .andWhere('rating.ownerId = :id', { id: user.id })
        .getRawMany();

    //avoids duplication by storing in keys
    const ratedAt: { [key: string]: boolean } = {}
    const ratedScenes: { [key: string]: boolean } = {}

    ratingsToday.forEach(rating => {
        ratedAt[rating.created] = true;
        ratedScenes[rating.scene] = true;
    });

    //placed after query to guarantee that limit will not be broken at edge cases
    const now = new Date();

    const max_ratings = 5;
    const current_ratings = Object.keys(ratedAt).length;
    const remaining_ratings = max_ratings - current_ratings;

    if (ratedScenes[id] != undefined)
        return { code: 400, error: `Warning: Your vote is alreayd counted for scene id=${id}! Remaining daily ratings: ${remaining_ratings}!`, redirect: `/scene/${id}`};

    if (remaining_ratings <= 0) {
        const tomorrow = new Date();
        tomorrow.setHours(23, 59, 59, 999);
        let sec = Math.floor((tomorrow.getTime() - now.getTime()) / 1000);
        let min = Math.floor(sec / 60);
        let hrs = Math.floor(min / 60);
        sec -= min*60;
        min -= hrs*60;
        return { code: 400, error: `Warning: You can only vote ${max_ratings} times per day. Time remaining: ${hrs}h:${min}m:${sec}s!`, redirect: `/scene/${id}`};
    }

    //vote positive recursively (first 10 parents)
    if (rating == RatingType.POSITIVE) {
        const ids = Scene.getIdChainToRoot(id);
        
        const scenes = await config.dataSource.getRepository(Scene)
        .createQueryBuilder('scene')
        .select(['scene.id', 'scene.likes'])
        .where('scene.id IN (:...ids)', { ids })
        .orderBy('scene.id', 'DESC')
        .limit(10).getMany() as Scene[]; //always exists
        
        for (let i = 0; i < scenes.length; i++) {
            const scene = scenes[i];
            if (ratedScenes[scene.id] != undefined)
                break; //not counting double votes for same scene ancestor

            scene.likes++;
            const sceneRating = SceneRating.create({
                type: rating,
                owner: user,
                scene: scene,
                created: now //important for them all to be the same
            });
            //asynchronously
            scene.save();
            sceneRating.save();
        }
        return { code: 200, info: `Successfully liked scene id=${id} and previous ones! Remaining daily ratings: ${remaining_ratings-1}!`, redirect: `/scene/${id}`};

    //not recursive
    } else /* if (rating == RatingType.NEGATIVE) */ {
        const scene = await config.dataSource.getRepository(Scene)
            .createQueryBuilder('scene')
            .select(['scene.id', 'scene.dislikes'])
            .where('scene.id = :id', { id })
            .getOne() as Scene; //always exists

        scene.dislikes++;
        const sceneRating = SceneRating.create({
            type: rating,
            owner: user,
            scene: scene,
            created: now
        });
        //asynchronously
        scene.save(); 
        sceneRating.save();

        return { code: 200, info: `Successfully disliked scene id=${id}! Remaining daily ratings: ${remaining_ratings-1}!`, redirect: `/scene/${id}` };
    }
}
