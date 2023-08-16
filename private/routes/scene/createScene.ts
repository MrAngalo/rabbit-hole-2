import express from 'express';
import { Request, Response } from 'express-serve-static-core';
import { User, UserPremission } from '../../entities/User';
import { Scene, SceneStatus } from '../../entities/Scene';
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
          'parent.status',
      ])
      .where('parent.id = :parentId', { parentId })
      .getOne() as Scene; //always exists

    if (parent.status != SceneStatus.PUBLIC) {
      (req.session as any).myinfo = { error: `The parent scene id=${parentId} is not open to the public yet!` };
      return res.redirect('/');
    }

    if (!Scene.hasFreeChildSlot(parentId)) {
      (req.session as any).myinfo = { error: `There are no more children available for parent scene id=${parentId}!` };
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
    
  const gifId:string|undefined = req.body.gifId
  
  const user = req.user as User;
  const parent = await config.dataSource.getRepository(Scene)
  .createQueryBuilder('parent')
  .select([
      'parent.id',
      'parent.title',
      'parent.description',
      'parent.gifId',
      'parent.status',
  ])
  .where('parent.id = :parentId', { parentId })
  .getOne() as Scene; //always exists

  //
  // data validation
  //
  if (parent.status != SceneStatus.PUBLIC)
    return { code: 400, error: `The parent scene id=${parentId} is not open to the public yet!`, redirect: '/'};

  if (!Scene.hasFreeChildSlot(parent.id)) /* should almost never happen, only for the very unfortunate ones */
    return { code: 400, error: `There are no more children available for parent scene id = ${parentId}!`, redirect: `/create/${parent.id}/`}
  
  if (title == undefined || description == undefined || gifId == undefined)
    return { code: 400, error: `At least one of the fields is empty!`, redirect: `/create/${parent.id}/`}

  if (title.length < 5 || title.length > 40)
    return { code: 400, error: `Title length must be between 5 and 40 characters!`, redirect: `/create/${parent.id}/`}
  
  if (description.length < 80 || description.length > 3000)
    return { code: 400, error: `Description length must be between 80 and 3000 characters!`, redirect: `/create/${parent.id}/`}
  
  if (!(await tenorIdsExist([gifId+''])))
    return { code: 400, error: `Tenor GIF ID is invalid!`, redirect: `/create/${parent.id}/`}

  //if the user is trusted, their scene is public immediately
  const status = (user.permission >= UserPremission.TRUSTED) ? SceneStatus.PUBLIC : SceneStatus.AWAITING_REVIEW;

  const scene = Scene.create({
    parent: parent,
    creator: user,
    creator_name: user.username,
    title: title as string,
    description: description as string,
    gifId: gifId,
    status: status,
  });

  await scene.save();
  Scene.addRelationToCache(scene.id, parent.id);

  //this is going to be around 90% of the cases because of new users
  if (status == SceneStatus.AWAITING_REVIEW) {
    //TODO, send email to admins to notify scene requires validation

  }

  return { code: 200, info: 'Successfully created scene!', redirect: `/scene/${scene.id}`};
}
