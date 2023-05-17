import express from "express";
import { DataSource } from "typeorm";
import { Scene } from "../entities/Scene";

module.exports = fetchSceneRouter
export = fetchSceneRouter;

function fetchSceneRouter(config:{dataSource: DataSource}) {

    const router = express.Router();
    router.get('/scene', function(req, res) {
        var id:string = req.query.id+'' || '0';
        if (id.match(/^\d+$/)) {
            res.redirect('/scene/'+id);
        } else {
            (req.session as any).myinfo = { warn: `Warning: scene id must be a whole number` };
            res.redirect('/scene/0');
        }
    });

    router.get('/scene/:id(\\d+)', async function (req, res) {
        const id:number = parseInt(req.params.id);
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
            .getOne();

        if (scene == null) {
            (req.session as any).myinfo = { warn: `Warning: scene id=${id} does not exist or has been removed` };
            res.redirect('/scene/0');
            return;
        }
            
        //scenes cannot have themselves as children (fix for scene 0)
        // scene.children = scene.children.filter(child => child.id != scene.id);

        scene.children.sort((a, b) => {
            if (a.badges.length > b.badges.length) return -1;
            if (a.badges.length < b.badges.length) return 1;

            var ratioA = a.likes / (a.likes + a.dislikes);
            var ratioB = b.likes / (b.likes + b.dislikes);
            return Math.sign(ratioA - ratioB);
        });
        
        //the content of the buttons of each scene
        var options = [];
        
        var i = 0;
        var length = Math.min(scene.children.length, Scene.getMaxChildren())
        while(i < length) {
            var child = scene.children[i];
            options.push({id: child.id, title: child.title});
            i++;
        }
        while (i < Scene.getMaxChildren()) {
            //scenes with id equal to -1 is a flag to a create new branch
            options.push({id: -1, title: "Create your action"})
            i++;
        }
        
        var parentId = Scene.getParentId(scene.id);
        if (parentId != null) {
            //only add return option if scene is not root (should only be scene id=0)
            options.push({id: parentId, title: "Go Back!"});
        }

        res.render("scene", { scene, options, csrfToken: req.csrfToken()});
    });
    return router;
}
