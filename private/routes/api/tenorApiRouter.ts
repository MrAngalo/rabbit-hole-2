import express from "express";

module.exports = tenorApiRouter
export = tenorApiRouter;

function tenorApiRouter(config:{Tenor: any}) {

    const router = express.Router();
    router.post('/api/gif', async function (req, res) {
        res.type('application/json');

        let id:string = req.body.id || '';
        
        config.Tenor.Search.Find(id.split(',')).then((results:any) => {
            res.status(200).json({results});
        }).catch((e:Error) => {
            console.log("");
            console.log(e);
            res.status(400).json({ code: 400, error: e.message})
        });
    });

    router.post('/api/search', async function (req, res) {
        res.type('application/json');

        let query:string = req.body.q as string || '';
        let limit:string = req.body.limit as string || '';

        config.Tenor.Search.Query(query, limit).then((results:any) => {
            res.status(200).json({results});
        }).catch((e:Error) => {
            console.log("");
            console.log(e);
            res.status(400).json({ code: 400, error: e.message})
        });
    });

    return router;
}
