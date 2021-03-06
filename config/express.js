
/**
 * config/express.js
 */
 
'use strict';

var express = require('express');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var session = require('express-session');
var morgan  = require('morgan'); // HTTP request logger
var config = require('./config');
var cons = require('consolidate');

module.exports = function (app, passport) {

    // set ups for view engine
    app.engine('html', cons.lodash);
    app.set('view engine', 'html');
    app.set('views', config.root + '/public/views');
    app.set('port', config.port);

    app.use(express.static(config.root + '/public'));

    app.use(cookieParser()); // wbr
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());
    app.use(methodOverride());
    if (config.env === 'development') {
        app.use(morgan('dev')); // logger
    }
    // app.use(morgan('combined')); // logger
    app.use(session(config.session)); //wbr
    app.use(passport.initialize());
    app.use(passport.session()); //wbr
};