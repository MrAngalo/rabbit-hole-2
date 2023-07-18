import express from 'express';
import { Request, Response } from 'express-serve-static-core';
import { User } from '../../entities/User';
import { Scene } from '../../entities/Scene';
import { tenorIdsExist } from '../../config/tenor-utils';
import { JSONResponse, checkAuthenticated, redirectJSON } from '../middleware';
import { DataSource } from 'typeorm';

export function createSceneRouter(config:{dataSource: DataSource}) {
  
  const router = express.Router();
  router.get('/create', function(req, res) {
    let id:string = (req.query.id != undefined) ? req.query.id+'' : '0';
    if (!id.match(/\d+/))
        return res.redirect('/');

    res.redirect(`/create/${id}`);
  });

  router.get('/create/:id(\\d+)', checkAuthenticated, async function (req, res) {
    const parentId:number = parseInt(req.params.id);

    if (!Scene.exists(parentId)){ 
      (req.session as any).myinfo = { warn: `Warning: Scene id=${parentId} does not exist or has been removed` };
      return res.redirect('/');
    }

    const parent = await config.dataSource.getRepository(Scene)
      .createQueryBuilder('parent')
      .select([
          'parent.id',
          'parent.title',
          'parent.description',
          'parent.gifId',
      ])
      .where('parent.id = :parentId', { parentId })
      .getOne() as Scene; //always exists

    if (!Scene.hasFreeChildSlot(parentId)) {
      (req.session as any).myinfo = { error: `Error: There are no more children available for parent scene id = ${parentId}!` };
      return res.redirect('/');
    }

    res.render("create", { parent, csrfToken: req.csrfToken() });
  });

  router.post('/create/:id(\\d+)', checkAuthenticated, redirectJSON({
    logic: (req, res) => createSceneJSON(req, res, config),
    saveFieldsOnFail: true,
    displaySuccessInfo: true,
  }));

  return router;
}

export async function createSceneJSON(req: Request, res: Response, config: { dataSource: DataSource}) : Promise<JSONResponse> {
  const parentId:number = parseInt(req.params.id);

  if (!Scene.exists(parentId))
    return {code: 400, error: `Scene id=${parentId} does not exist or has been removed`, redirect: '/'};
  
  //remove double spaces in string
  const title:string|undefined = req.body.title?.trim()
    .replace(/\s{2,}/g, ' ');

  const description:string|undefined = req.body.description?.trim()
    .replace(/^[ ]+|[ ]+$/mg, '')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/[\r\n\t\f\v]+/g, '\\n');
    
  const gifId:number|undefined = req.body.gifId
  
  const user = req.user as User;
  const parent = await config.dataSource.getRepository(Scene)
  .createQueryBuilder('parent')
  .select([
      'parent.id',
      'parent.title',
      'parent.description',
      'parent.gifId',
  ])
  .where('parent.id = :parentId', { parentId })
  .getOne() as Scene; //always exists

  let error = await (async function() {
    if (!Scene.hasFreeChildSlot(parent.id)) /* should almost never happen, only for the very unfortunate ones */
      return `Error: There are no more children available for parent scene id = ${parentId}!`;
    
    if (title == undefined || description == undefined || gifId == undefined)
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

  if (error)
    return { code: 400, error, redirect: `/create/${parent.id}/`};

  const scene = Scene.create({
    parent: parent,
    creator: user,
    creator_name: user.username,
    title: title as string,
    description: description as string,
    gifId: gifId as number
  });

  await scene.save();
  Scene.addRelationToCache(scene.id, parent.id);

  return { code: 200, info: 'Successfully created scene!', redirect: `/scene/${scene.id}`};
}
