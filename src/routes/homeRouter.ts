import express from "express";

module.exports = homeRouter
export = homeRouter;

const router = express.Router();
function homeRouter() {
    router.get('/', function (req, res) {
        res.render("home");
    });
    return router;
}