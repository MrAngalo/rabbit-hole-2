import express from 'express';
import { User } from '../entities/User';
import { Scene } from '../entities/Scene';
import { tenorIdsExist } from '../utils/tenor-utils';
import { checkAuthenticated } from './middleware';
import { DataSource } from 'typeorm';

module.exports = createSceneRouter
export = createSceneRouter;

const router = express.Router();
function createSceneRouter(config:{dataSource: DataSource, globals:any}) {

  router.get('/create', function(req, res) {
    var id:string = req.query.id+'' || '0';
    if (!id.match(/\d+/))
        return res.redirect('/');

    res.redirect(`/create/${id}`);
  });

  router.get('/create/:id(\\d+)', checkAuthenticated, async function (req, res) {
    const parentId:number = parseInt(req.params.id);
    const parent = await config.dataSource.getRepository(Scene)
      .createQueryBuilder('parent')
      .leftJoinAndSelect('parent.children', 'children')
      .select([
          'parent.id',
          'parent.title',
          'parent.description',
          'parent.gifId',
          'children.id'
      ])
      .where('parent.id = :parentId', { parentId })
      .getOne();

    var error = (function() {
      if (parent == null)
        return "Error: Current scene does not exist!";

      if (!parent.hasFreeChildSlot())
        return `Error: There are no more children available for parent scene id = ${parentId}!`;

      return null;
    })();
    if (error) {
      (req.session as any).myinfo = { error };
      return res.redirect('/');
    }


    res.render("create", { parent, csrfToken: req.csrfToken() });
  });

  router.post('/create/:id(\\d+)', checkAuthenticated, async function (req, res) {
    const parentId:number = parseInt(req.params.id);
    
    //remove double spaces in string
    const title:string|null = req.body.title?.trim()
      .replace(/\s{2,}/g, ' ');
    const description:string|null = req.body.description?.trim()
      .replace(/^[ ]+|[ ]+$/mg, '')
      .replace(/[ ]{2,}/g, ' ')
      .replace(/[\r\n\t\f\v]+/g, '\\n');
    const gifId:number|null = req.body.gifId
    
    const user = req.user as User;
    const parent = await config.dataSource.getRepository(Scene)
    .createQueryBuilder('parent')
    .leftJoinAndSelect('parent.children', 'children')
    .select([
        'parent.id',
        'parent.title',
        'parent.description',
        'parent.gifId',
        'children.id'
    ])
    .where('parent.id = :parentId', { parentId })
    .getOne();

    if (parent == null)
      return res.redirect('/');

    console.log("--------------");
    console.log(parent);

    var error = await (async function() {
      if (!parent.hasFreeChildSlot()) /* should almost never happen, only for the very unfortunate ones */
        return `Error: There are no more children available for parent scene id = ${parentId}!`;
      
      if (title == null || description == null || gifId == null)
        return `Error: At least one of the fields is empty!`;
      
      if (title.length < 5 || title.length > 40)
        return `Error: Title length must be between 5 and 40 characters!`;

      if (description.length < 80 || description.length > 3000)
        return `Error: Description length must be between 80 and 3000 characters!`;

      console.log(gifId);

      if (!(await tenorIdsExist([gifId+''])))
        return `Error: Tenor GIF ID is invalid!`;

      return null;
    })();

    if (error) {
        (req.session as any).myinfo = { error };
        (req.session as any).fields = req.body;
        res.redirect(`/create/${parent.id}`);
        return;
        // return res.render('create', { error, parent, fields: req.body, csrfToken: req.csrfToken() });
    }

    const scene = Scene.create({
      parent: parent,
      creator: user,
      creator_name: user.username,
      title: title as string,
      description: description as string,
      gifId: gifId as number
    });

    await scene.save();

    config.globals.scene_count++;

    res.redirect(`/scene/${scene.id}`);
  });
  return router;
}
