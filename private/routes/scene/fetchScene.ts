import express from "express";
import { DataSource } from "typeorm";
import { Scene } from "../../entities/Scene";
import { Request, Response } from "express-serve-static-core";
import { JSONResponse } from "../../util/types";

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
            res.redirect('/');
            return;
        }

        json.response.csrfToken = req.csrfToken();
        res.render("scene", json.response);
    });
    return router;
}
export async function fetchSceneJSON(req:Request,res:Response, config:{dataSource: DataSource}) : Promise<JSONResponse> {
    const id:number = parseInt(req.params.id);

    if (!Scene.exists(id))
        return { code: 400, error: `Scene id=${id} does not exist or has been removed`};

    const scene = await config.dataSource.getRepository(Scene)
        .createQueryBuilder('scene')
        .leftJoinAndSelect('scene.creator', 'creator')
        .leftJoinAndSelect('scene.badges', 'badges')
        .leftJoinAndSelect('scene.children', 'children')
        .leftJoinAndSelect('children.badges', 'children_badges')
        .select([
            'scene',
            'creator.id',
            'children.id',
            'children.title',
            'children.likes',
            'children.dislikes',
            'children_badges',
            'badges'
        ])
        .where('scene.id = :id', { id })
        .getOne() as Scene; //always exists

    scene.children.sort((a, b) => {
        if (b.badges.length > a.badges.length) return 1;
        if (b.badges.length < a.badges.length) return -1;

        let ratioB = b.likes / (b.likes + b.dislikes +1); //+1 avoids division by 0
        let ratioA = a.likes / (a.likes + a.dislikes +1); //+1 avoids division by 0
        return Math.sign(ratioB - ratioA);
    });
    
    //the content of the buttons of each scene
    let options = [];
    let i = 0;
    let length = Math.min(scene.children.length, Scene.getMaxChildren())
    while(i < length) {
        let child = scene.children[i];
        options.push({id: child.id, title: child.title});
        i++;
    }
    while (i < Scene.getMaxChildren()) {
        //scenes with id equal to -1 is a flag to a create new branch
        options.push({id: -1, title: "Create your action"})
        i++;
    }
    let parentId = Scene.getParentId(scene.id);
    if (parentId != null) {
        //only add return option if scene is not root (should only be scene id=0)
        options.push({id: parentId, title: "Go Back!"});
    }
    return { code: 200, response: { scene, options } };
}
