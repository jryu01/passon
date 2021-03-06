/**
 * config/passport.js
 * passport configuration file
 */

'use strict';

var config = require('./config');
var LocalStrategy = require('passport-local').Strategy; // wbr
var FacebookStrategy = require('passport-facebook').Strategy; // wbr
var jwt = require('jwt-simple');
var BearerStrategy = require('passport-http-bearer').Strategy;
var User = require('../app/models/user');

module.exports = function (passport) {


  // Bearer Strategy for token authentication
  passport.use(new BearerStrategy(
  function (token, done) {
    var decoded = null;
    try {
      decoded = jwt.decode(token, config.jwt.secret);
    } catch (err) {
      var error = new Error();
      error.message = "Invalid Token: " + err.message;
      return done(error);
    }

    if (decoded.exp <= Date.now()) {
      return done(null, false, {
        message: 'Access token has expired' 
      });
    }

    User.findById(decoded.iss, function (err, user) {
      if (err) { return done(err); }
      if (!user) { return done(null, false); }
      return done(null, user);
    });
  }));

// 
// Below will be depreciated
//
    
  // serialize user into session
  passport.serializeUser(function(user, done) {
    done(null, user.id);
  });

  // deseriallize user
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  }); 

  // Local Strategy
  passport.use(new LocalStrategy({
    usernameField: 'email', 
    passwordField: 'password'
  },
  function (email, password, done) {
    User.
    findOne({ 'local.email': email }, function(err, user) {
      if (err) { return done(err); }
      if (!user) {
        return done(null, false, { message: 'Unknown email' });
      }
      user.comparePassword(password, function (err, isMatch) {
        if (err) { return done(err); }
        if(!isMatch) {
          return done(null, false, { message: 'Invalid password.' });
        }
        return done(null, user);
      });
    });
  }));

  // Facebook Strategy
  passport.use(new FacebookStrategy({

    clientID: config.facebook.clientID,
    clientSecret: config.facebook.clientSecret,
    callbackURL: config.facebook.callbackURL,
    profileFields: ['id', 'name', 'emails', 'photos'],
  }, 
  function (accessToken, refreshToken, profile, done) {
    User.findOne({'facebook.id': profile.id}, function (err, user) {
      if (err) { return done(err); }
      if (user) { return done(null, user); }
      if (!user) {

        // create a new user
        user = new User();

        user.name.givenName = profile.name.givenName;
        user.name.familyName = profile.name.familyName;
        user.name.displayName = profile.name.givenName + 
                            ' ' + profile.name.familyName;
        user.emails.primaryEmail = profile.emails[0].value;
        user.photos.profile = profile.photos[0].value;

        user.facebook.id = profile.id;
        user.facebook.name = profile.name.givenName + 
                            ' ' + profile.name.familyName;
        user.facebook.email = profile.emails[0].value;
        user.facebook.profilePicture = profile.photos[0].value;
        user.facebook.accessToken = accessToken;

        user.save(function (err) {
          if (err) { return done(err); }
          console.log(user);
          return done(null, user);
        });
      }
    });
  }));
};
