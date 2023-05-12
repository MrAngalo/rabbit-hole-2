import express from "express";

module.exports = guidelineRouter
export = guidelineRouter;

const router = express.Router();
function guidelineRouter() {
    router.get('/guidelines', function(req, res) {
        res.render('guidelines');
    });
    return router;
}