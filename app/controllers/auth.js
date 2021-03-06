
/*
* app/controllers/auth.js
*/

'use strict';

var passport = require('passport');
var User = require('../models/user');
var jwt = require('jwt-simple');
var request = require('request');
var config = require('../../config/config');

///////////////////////////////////////////////////////////////////////////////
// Middlewares
///////////////////////////////////////////////////////////////////////////////

// bearerAuth middleware
function bearerAuth(req, res, next) {
  passport.authenticate('bearer', { session: false }, 
  function(err, user, info) {
    if (err) return res.status(500).json(err);
    if (!req.query.access_token) {
      return res.status(401).json( {
        message: "An access token must be provided"
      });
    }
    if (!user) {
      return res.status(401).json( { 
        message: "Access token has expired or is invalid" 
      });
    }
    // login user and proceed to next
    req.user = user;
    next();
  })(req, res, next);
}

// generic require signin middleware
function requiresAuth(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.status(401).json( { message: "requires authentication"});
  }
  next();
}

///////////////////////////////////////////////////////////////////////////////
// End callbacks
///////////////////////////////////////////////////////////////////////////////

function issueAccessToken(req, res) {

  if (!req.body.grantType) {
    return res.status(400).json({ message: 'Missing grantType field.'});
  }

  if (req.body.grantType === 'facebookToken') {
    if (!req.body.facebookToken) {
      return res.status(400).json({ message: 'Missing facebookToken field.'});
    }
    getFacebookProfile(req.body.facebookToken, function (err, profile) {
      if (err) { return res.status(err.status || 500).json(err); }

      // find a user with facebook id and create one 
      // if does not already exist
      User.findOne({'facebook.id': profile.id}, function (err, user) {
        if (err) { return res.status(500).json(err); }
        if (user) {
          // issue a token
          var token = issueTokenWithUid(user.id);
          return res.json({ access_token: token, user: user });
        } 
        if (!user) {
          // create a new user
          user = new User();

          user.name.givenName = profile.first_name; 
          user.name.familyName = profile.last_name;
          user.name.displayName = profile.name; 
          user.emails.primaryEmail = profile.email;

          user.facebook.id = profile.id;
          user.facebook.email = profile.email;
          user.facebook.accessToken = req.body.facebookToken;

          if (profile.picture && profile.picture.data) {
            user.photos.profile = profile.picture.data.url;
            user.facebook.profilePicture = profile.picture.data.url;
          }

          //save user and issue a token
          user.save(function (err) {
            if (err) { return res.status(500).json(err); }
            // issue a token
            var token = issueTokenWithUid(user.id);
            return res.json({ access_token: token, user: user });
          });
        }
      });
    });

  } else if (req.body.grantType === 'password') {
    if (!req.body.email) {
      return res.status(400).json({ message: 'Missing email field.'});
    }
    if (!req.body.password) {
      return res.status(400).json({ message: 'Missing password field.'});
    }
    // User.
    //   findOne({ 'local.email': req.body.email }, function (err, user) {
    //     if (err) { return res.status(500).json(err); }
    //     if (!user) {
    //       return res.status(401).json( { message: 'Unknown email'});
    //     }
    //     user.comparePassword(req.body.password, function (err, isMatch) {
    //       if (err) { return res.status(500).json(err); }
    //       if(!isMatch) {
    //         return res.status(401).json( { message: 'Invalid password.' });
    //       }

    //       // issue a token
    //       var token = issueTokenWithUid(user.id);

    //       return res.json({ access_token: token, user: user });
    //     });
    //   }); 
  } else {
    return res.status(400).json({ message: 'Invalid grant type.'});
  }
}

function signup(req, res, next) {

  var email = req.body.email;
  var password = req.body.password;

  // validate email and password
  if(!email || !email.length) {
    return res.status(400).json({ message: 'email is not valid' });
  }
  if(!password || !password.length) {
    return res.status(400).json({ message: 'password is not valid' });
  }
  
  User.findOne({ 'local.email': email }, function (err, user) {
    if (err) { return next(err); }

    // check if user is already exists
    if (user) {
      return res.status(409).json({ message: 'the email is already taken.' });
    }

    // create and save a new user
    user = new User();
    user.local.email = email;
    user.local.password = password;

    user.save(function (err, user) {
      if (err) { return next(err); }

      // issue a token
      var token = issueTokenWithUid(user.id);

      return res.json({ access_token: token, user: user });
    });
  });
}


///////////////////////////////////////////////////////////////////////////////
// Helpers
///////////////////////////////////////////////////////////////////////////////
function issueTokenWithUid(uid) {

  var curDate = new Date();
  // expires in 60 days 
  var expires = new Date(curDate.getTime() + (60*24*60*60*1000));

  var token = jwt.encode({
    iss: uid, // issuer
    exp: expires.getTime() // expiration time
  }, config.jwt.secret);

  return token;
}
function getFacebookProfile(fbToken, callback) {

  // get facebook profile and picture with provided token
  var url = 'https://graph.facebook.com/me';
  var fields = 'id,name,first_name,last_name,email,picture';
  url = url + '?fields=' + fields + '&access_token=' + fbToken;

  // get facebook profile
  request(url, function (error, response, body) {
    if(!error && response.statusCode === 200) {
      var profile = JSON.parse(body);
      return callback(null, profile);
    } else {
      var err = new Error();
      err.status = 500;
      var json = null;
      try {
        json = JSON.parse(body);
      } catch (e) {}
      if (json && json.error) {
        err.name = 'FacebookGraphAPIError';
        err.message = json.error.message;
        err.type = json.error.type;
        err.code = json.error.code;
        err.subcode = json.error.subcode;
        err.status = 400;
      } else {
        err.message = 'Failed to fetch facebook user profile';
      }
      return callback(err);
    }
  });
}
///////////////////////////////////////////////////////////////////////////////


// Following codes WILL BE DEPRECIATED

// authentication controller functions 
var facebookAuth = passport.authenticate('facebook', { scope : 'email' });
var facebookCallback = passport.authenticate('facebook', { 
  failureRedirect : '/',
});

function facebookRedirect(req, res) {
  // update lastLogined field of the user and redirect to home
  var operator = { "$set": { "lastLogined": new Date() } };
  User.findByIdAndUpdate(req.user.id, operator, {}, function (err, user) {
    if (err) { console.log(err); }
    res.redirect('/');
  });
}

function signin(req, res, next) {
  passport.authenticate('local', function (err, user, info) {
    if (err) { return next(err); }
    if (!user) {
      req.session.message = [info.message];
      return res.status(401).json(info);
    }
    // if user, Log in
    req.logIn(user, function(err) {
      if (err) { return next(err); }
      return res.json(user.toJSON());
    });
  })(req, res, next);
}

function signup(req, res, next) {

  var email = req.body.email;
  var password = req.body.password;

  // validate email and password
  if(!email || !email.length) {
    return res.status(400).json({ message: 'email is not valid' });
  }
  if(!password || !password.length) {
    return res.status(400).json({ message: 'password is not valid' });
  }
  
  User.findOne({ 'local.email': email }, function (err, user) {
    if (err) { return next(err); }

    // check if user is already exists
    if (user) {
      return res.status(409).json({ message: 'the email is already taken.' });
    }

    // create and save a new user
    user = new User();
    user.local.email = email;
    user.local.password = password;

    user.save(function (err, user) {
      if (err) { return next(err); }

      // login after user is registered and saved
      req.logIn(user, function (err) {
        return res.json(user.toJSON());
      });
    });
  });
}

function signout(req, res) {
  req.logout();
  res.json(200);
}

function checkSignin(req, res) {
  res.json(req.isAuthenticated() ? req.user.toJSON() : '0');
}

// public functions and variables 
exports.issueAccessToken = issueAccessToken;
exports.bearerAuth = bearerAuth;
exports.requiresAuth = requiresAuth;
// exports.signup = signup;

// following will be depreicated
// public functions and variables 
exports.signin = signin;
exports.signup = signup;
exports.signout = signout;
exports.checkSignin = checkSignin;
exports.facebookAuth = facebookAuth;
exports.facebookCallback = facebookCallback;
exports.facebookRedirect = facebookRedirect;