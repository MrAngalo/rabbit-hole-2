import express from "express";
import { DataSource } from "typeorm";
import { Scene } from "../../entities/Scene";

module.exports = fetchSceneRouter
export = fetchSceneRouter;

function fetchSceneRouter(config:{dataSource: DataSource}) {

    const router = express.Router();
    router.get('/scene', function(req, res) {
        let id:string = (req.query.id != undefined) ? req.query.id+'' : '0';
        if (id.match(/^\d+$/)) {
            res.redirect('/scene/'+id);
        } else {
            (req.session as any).myinfo = { warn: `Warning: scene id must be a whole number` };
            res.redirect('/scene/0');
        }
    });

    router.get('/scene/:id(\\d+)', async function (req, res) {
        const id:number = parseInt(req.params.id);

        if (!Scene.exists(id)) {
            (req.session as any).myinfo = { warn: `Warning: scene id=${id} does not exist or has been removed` };
            res.redirect('/');
            return;
        }

        const scene = await config.dataSource.getRepository(Scene)
            .createQueryBuilder('scene')
            .leftJoinAndSelect('scene.badges', 'badges')
            .leftJoinAndSelect('scene.children', 'children')
            .leftJoinAndSelect('children.badges', 'children_badges')
            .select([
                'scene',
                'children.id',
                'children.title',
                'children.likes',
                'children.dislikes',
                'children_badges',
                'badges'
            ])
            .where('scene.id = :id', { id })
            .getOne() as Scene; //always exists
            
        //scenes cannot have themselves as children (fix for scene 0)
        // scene.children = scene.children.filter(child => child.id != scene.id);

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

        res.render("scene", { scene, options, csrfToken: req.csrfToken()});
    });
    return router;
}
