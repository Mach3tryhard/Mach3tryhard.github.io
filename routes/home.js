const path = require('path');

const express = require("express");

const rootDir = require("../util/path");

let router = express.Router();

router.get('',(req, res, next) => {
    res.sendFile(path.join(rootDir,'views','home.html'));
});

module.exports = router;