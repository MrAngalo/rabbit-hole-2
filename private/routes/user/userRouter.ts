import express from "express";
import { User, UserPremission } from "../../entities/User";
import { DataSource } from "typeorm";
import { checkAuthenticated } from "../middleware";

module.exports = userRouter
export = userRouter;

const router = express.Router();
function userRouter(config:{dataSource: DataSource}) {

    router.get('/account', checkAuthenticated, function (req, res) {
        res.render("user/account", {csrfToken: req.csrfToken()});
    });

    router.get('/user/:username', async function (req, res) {
        const username = req.params.username;
        const user = await config.dataSource.getRepository(User)
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.scenes', 'scenes')
            .select([
                'user.id',
                'user.username',
                'user.permission',
                'user.created',
                'scenes.id',
                'scenes.title',
                'scenes.gifId',
                'scenes.created',
                'scenes.likes',
                'scenes.dislikes',
            ])
            .where('user.username_lower = :u', { u: username.toLowerCase() })
            .orderBy('scenes.id', 'DESC')
            .getOne();
        
        if (user == null) {
            (req.session as any).myinfo = { error: `Error: The user "${username}" does not exist or was removed!`};
            res.redirect(`/`);
            return;
        }

        res.render("user/userpage", { user, UserPremission, csrfToken: req.csrfToken()});
    });

    return router;
};