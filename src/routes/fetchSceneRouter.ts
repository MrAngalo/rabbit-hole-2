import express from "express";
import { DataSource } from "typeorm";
import { Scene } from "../entities/Scene";

module.exports = fetchSceneRouter
export = fetchSceneRouter;

function fetchSceneRouter(config:{dataSource: DataSource}) {

    const router = express.Router();
    router.get('/scene', function(req, res) {
        var id:string = req.query.id+'' || '0';
        if (id.match(/\d+/)) {
            res.redirect('/scene/'+id);
        } else {
            res.redirect('/');
        }
    });

    router.get('/scene/:id(\\d+)', async function (req, res) {
        const id:number = parseInt(req.params.id);
        const scene = await config.dataSource.getRepository(Scene)
            .createQueryBuilder('scene')
            .leftJoinAndSelect('scene.parent', 'parent')
            .leftJoinAndSelect('scene.children', 'children')
            .select([
                'scene',
                'parent.id',
                'children.id',
                'children.title',
                'children.likes',
                'children.dislikes'
            ])
            .where('scene.id = :id', { id })
            .getOne();

        if (scene == null)
            return res.redirect('/scene/0');
            
        //scenes cannot have themselves as children (fix for scene 0)
        // scene.children = scene.children.filter(child => child.id != scene.id);
        scene.children.sort((a, b) => {
            var ratioA = a.likes / (a.likes + a.dislikes);
            var ratioB = b.likes / (b.likes + b.dislikes);
            return Math.sign(ratioA - ratioB);
        });

        //scenes with id equal to -1 is a flag to a create new branch
        const default_option = {id: -1, title: "Create your action"};
        
        var options = [ default_option, default_option, default_option];
        var length = Math.min(options.length, scene.children.length)
        for (var i = 0; i < length; i++) {
            var child = scene.children[i];
            options[i] = {id: child.id, title: child.title};
        }
        
        //only add return option if scene is not root
        if (scene.parent) options.push({id: scene.parent.id, title: "Go Back!"});

        res.render("scene", { scene, options, csrfToken: req.csrfToken()});
    });
    return router;
}
