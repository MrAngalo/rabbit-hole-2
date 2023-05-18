import express from "express";
import { checkAuthenticated } from "./middleware";
import { User } from "../entities/User";
import { Scene } from "../entities/Scene";
import { RatingType, SceneRating } from "../entities/Rating";
import { DataSource } from "typeorm";

module.exports = rateSceneRouter
export = rateSceneRouter;

function rateSceneRouter(config:{dataSource: DataSource}) {
    const router = express.Router();

    router.post('/rate/:id(\\d+)', checkAuthenticated, async function (req, res) {
        const id:number = parseInt(req.params.id);
        const rating = RatingType[req.body.rating.toUpperCase() as keyof typeof RatingType];
        const user = req.user as User;

        if (!Scene.exists(id)) {
            (req.session as any).myinfo = { warn: `Warning: Scene id=${id} does not exist or has been removed` };
            res.redirect('/');
            return;
        }

        if (rating == undefined) {
            (req.session as any).myinfo = { warn: 'Warning: Rating type must be positive or negative!' };
            res.redirect(`/scene/${id}`);
            return;
        }

        //beginning of the day
        var today = new Date();
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

        if (ratedScenes[id] != undefined) {
            (req.session as any).myinfo = { warn: `Warning: Your vote is alreayd counted for scene id=${id}! Remaining daily ratings: ${remaining_ratings}!` };
            res.redirect(`/scene/${id}`);
            return;
        }

        if (remaining_ratings <= 0) {
            const tomorrow = new Date();
            tomorrow.setHours(23, 59, 59, 999);
            var sec = Math.floor((tomorrow.getTime() - now.getTime()) / 1000);
            var min = Math.floor(sec / 60);
            var hrs = Math.floor(min / 60);
            sec -= min*60;
            min -= hrs*60;
            (req.session as any).myinfo = { warn: `Warning: You can only vote ${max_ratings} times per day. Time remaining: ${hrs}h:${min}m:${sec}s!` };
            res.redirect(`/scene/${id}`);
            return;
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
                const sceneR = SceneRating.create({
                    type: rating,
                    owner: user,
                    scene: scene,
                    created: now //important for them all to be the same
                });
                //asynchronously
                scene.save();
                sceneR.save();
            }

            (req.session as any).myinfo = { info: `Successfully liked scene id=${id} and previous ones! Remaining daily ratings: ${remaining_ratings-1}!`};
            res.redirect(`/scene/${id}`);
            return;

        //not recursive
        } else /* if (rating == RatingType.NEGATIVE) */ {
            const scene = await config.dataSource.getRepository(Scene)
                .createQueryBuilder('scene')
                .select(['scene.id', 'scene.dislikes'])
                .where('scene.id = :id', { id })
                .getOne() as Scene; //always exists

            scene.dislikes++;
            const sceneR = SceneRating.create({
                type: rating,
                owner: user,
                scene: scene,
                created: now
            });
            //asynchronously
            scene.save(); 
            sceneR.save();

            (req.session as any).myinfo = { info: `Successfully disliked scene id=${id}! Remaining daily ratings: ${remaining_ratings-1}!` };
            res.redirect(`/scene/${id}`);
            return;
        }
    });

    return router;
}
