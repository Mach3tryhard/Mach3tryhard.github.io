const path = require('path');

const express = require('express');

const bodyParser = require('body-parser');

const app = express();

const homeRoute = require('./routes/home');

app.use(bodyParser.urlencoded({extended:false}));

app.use(express.static(path.join(__dirname,'public')));

app.use('/home',homeRoute);

app.use((req, res, next) => {
    res.status(404).sendFile(path.join(__dirname,'views','404.html'));
});

app.listen(3000);