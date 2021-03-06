/**
 * configuration file
 *
 */

'use strict';

var path = require('path');
var rootPath = path.normalize(__dirname + '/..');
var session = require('express-session');
var mongoStore = require('connect-mongo')({ session: session });
var env = process.env.NODE_ENV || 'development'; // env variable
var _ = require('lodash');


function getConfig (env) {

  var config = {};

  // Common configuration
  config.common =  {
    app: {
      name: "genesis"
    },
    port: process.env.PORT || 3000,
    root: rootPath, 
    mongo: {},
    jwt: {
      secret: "thisisjwtsecretpasson",
      maxAge: 60 * 24 * 60 * 60 * 1000 // 60 days
    },
  };

  // Development configuration
  config.development = {
    env: "development",
    mongo: {
      url: "mongodb://localhost/genesis-dev"
    },
    session: {
      key: "sid",
      cookie: { maxAge: 1000 * 60 * 60 * 24 * 30 }, // expires in 30 days
      secret: "thisisthefirstclasssecrets",
      resave: true,
      saveUninitialized: true,
      store: new mongoStore({
        url: "mongodb://localhost/genesis-dev",
        collection: 'sessions'
      })
    },
    facebook: {
      clientID: "260509677458558",
      clientSecret: "de40af5c2c28469be077a5527ac37f66",
      callbackURL: "http://localhost:3000/auth/facebook/callback" 
    }
  };

  // Test configuration
  config.test = {
    env: "test",
    port: process.env.PORT || 3030,
    mongo: {
      url: "mongodb://localhost/genesis-test"
    },
    session: {
      key: "sid",
      cookie: { maxAge: 1000 * 60 * 60 * 24 * 30 }, 
      secret: "thisisthefirstclasssecrets",
      resave: true,
      saveUninitialized: true,
      store: new mongoStore({
        url: "mongodb://localhost/genesis-test",
        collection: 'sessions'
      })
    },
    facebook: {
      clientID: "150906278446583",
      clientSecret: "889134fea8ac45197b20d65b9edba5cc",
      callbackURL: "http://www.test.pass-on.net/auth/facebook/callback" 
    }

  };

  // Production configuration
  config.production = {
    env: "production",
  };
  return _.merge(config.common, config[env]);
}

module.exports = getConfig(env);