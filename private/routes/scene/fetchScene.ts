import express from "express";
import { DataSource } from "typeorm";
import { Scene, SceneStatus } from "../../entities/Scene";
import { Request, Response } from "express-serve-static-core";
import { JSONResponse } from "../middleware";
import { User, UserPremission } from "../../entities/User";

export function fetchSceneRouter(config:{dataSource: DataSource}) {

    const router = express.Router();
    router.get('/scene', function(req, res) {
        let id:string = (req.query.id != undefined) ? req.query.id+'' : '0';
        if (id.match(/^\d+$/)) {
            res.redirect('/scene/'+id);
        } else {
            (req.session as any).myinfo = { error: `Scene id must be a whole number` };
            res.redirect('/scene/0');
        }
    });

    router.get('/scene/:id(\\d+)', async function (req, res) {
        const json = await fetchSceneJSON(req, res, config);
        if (json.code == 400) {
            (req.session as any).myinfo = { error: json.error };
            res.redirect(json.redirect);
            return;
        }
        json.response.csrfToken = req.csrfToken();
        json.response.UserPremission = UserPremission;
        res.render("scene", json.response);
    });

    return router;
}
export async function fetchSceneJSON(req:Request,res:Response, config:{dataSource: DataSource}) : Promise<JSONResponse> {
    const id:number = parseInt(req.params.id);

    if (!Scene.exists(id))
        return { code: 400, error: `Scene id=${id} does not exist or has been removed`, redirect: '/scene/0' };

    const scene = await config.dataSource.getRepository(Scene)
        .createQueryBuilder('scene')
        .leftJoinAndSelect('scene.creator', 'creator')
        .leftJoinAndSelect('scene.badges', 'badges')
        .leftJoinAndSelect('scene.parent', 'parent')
        .leftJoinAndSelect('scene.children', 'children')
        .leftJoinAndSelect('children.creator', 'children_creator')
        .leftJoinAndSelect('children.badges', 'children_badges')
        .select([
            'scene',
            'badges',
            'creator.id',
            'parent.id',
            'parent.status',
            'children.id',
            'children.title',
            'children.likes',
            'children.dislikes',
            'children.status',
            'children_creator.id',
            'children_badges',
        ])
        .where('scene.id = :id', { id })
        .getOne() as Scene; //always exists
    
    //only calls req.user when it needs
    let user:User;
    function userfn() {
        if (user == undefined) user = req.user as User;
        return user;
    }

    //if the scene is private, only the creator or a moderator can view it
    if (!allowedToViewScene(userfn, scene)) {
        return { code: 400, error: `The scene id=${id} is not open to the public yet!`, redirect: '/'};
    }

    scene.children.sort((a, b) => {
        if (b.badges.length > a.badges.length) return 1;
        if (b.badges.length < a.badges.length) return -1;

        let ratioB = b.likes / (b.likes + b.dislikes +1); //+1 avoids division by 0
        let ratioA = a.likes / (a.likes + a.dislikes +1); //+1 avoids division by 0
        return Math.sign(ratioB - ratioA);
    });
    

    //the content of the buttons of each scene
    let i = 0;
    let options = [];
    let length = Math.min(scene.children.length, Scene.getMaxChildren());
    while(i < length) {
        let child = scene.children[i];
        if (allowedToViewScene(userfn, child))
            options.push({id: child.id, title: child.title});
        i++;
    }
    //a scene can only have children if it is public, no options given
    if (scene.status == SceneStatus.PUBLIC) {
        while (i < Scene.getMaxChildren()) {
            //scenes with id equal to -1 is a flag to a create new branch
            options.push({id: -1, title: "Create your action"})
            i++;
        }
    }

    if (scene.parent != null) {
        //only add return option if scene is not root
        if (allowedToViewScene(userfn, scene.parent))
            options.push({id: scene.parent.id, title: "Go Back!"});
    }
    return { code: 200, info: 'Success', response: { scene, options, SceneStatus }, redirect: `/scene/${id}`};
}

function allowedToViewScene(userfn: () => User, scene: Scene) : boolean {
    if (scene.status == SceneStatus.PUBLIC) return true; //escape if scene is public

    const user = userfn();
    if (user == undefined) return false; //escape if user is logged off

    return user.id == scene.creator?.id //user created the scene
        || user.permission >= UserPremission.MODERATOR //user is a moderator or higher
        || user.view_await_review && scene.status == SceneStatus.AWAITING_REVIEW; //user can view await review scenes
}