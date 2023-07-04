import express from "express";

export function homeRouter() {
    
    const router = express.Router();
    router.get('/', function (req, res) {
        res.render("home");
    });
    return router;
}