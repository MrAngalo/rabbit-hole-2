import express from "express";

export function tenorRouter(config:{Tenor: any}) {

    const router = express.Router();
    router.post('/tenor/find', async function (req, res) {
        res.type('application/json');

        let id:string = req.body.id as string || '';
        
        config.Tenor.Search.Find(id.split(',').splice(0, 50)).then((results:any) => {
            res.status(200).json({ code: 200, results });
        }).catch((e:Error) => {
            console.log("");
            console.log(e);
            res.status(400).json({ code: 400, error: e.message })
        });
    });

    router.post('/tenor/search', async function (req, res) {
        res.type('application/json');

        let query:string = req.body.q as string || '';
        let limit:number = parseInt(req.body.limit) || 30;

        config.Tenor.Search.Query(query, Math.max(Math.min(limit, 50), 0)).then((results:any) => {
            res.status(200).json({ code: 200, results });
        }).catch((e:Error) => {
            console.log("");
            console.log(e);
            res.status(400).json({ code: 400, error: e.message})
        });
    });

    return router;
}
