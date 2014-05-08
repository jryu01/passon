/*
* app/controllers/post.js
*/
'use strict';

var validator = require('validator');
var _ = require('underscore');
var Post = require('../models/post');
var LIMIT = 5;
var PROFILE_TYPE = ['User', 'Event'];

/**
 * Handlers for REST API
 */

function list(req, res) {

  /**
   * query parameters
   * dateBefore: Date
   * limit: Number
   * commentsLimit: Number
   */
  var query = {};
  if (validator.isDate(req.query.dateBefore)) {
    query.createdAt = { $lt: req.query.dateBefore };
  }

  var projection = {};
  if (validator.isNumeric(req.query.commentsLimit) && 
      req.query.commentsLimit > 0) {
    projection.comments = { $slice: -1 * req.query.commentsLimit };
  }

  var options = {
    limit: req.query.limit || LIMIT,
    sort: {
      createdAt: -1
    }
  };

  Post.find(query, projection, options, function (err, posts) {
    if (err) return res.send(500);
    res.send(posts);
  }); 
}

function get(req, res) {
  Post.findById(req.params.id, function (err, post) {
    if (err) { return res.send(500); }
    res.send(post);
  });
}

// function get(req, res){:w

// }

function create(req, res){

  var sport = req.body.sport;
  var contents = req.body.contents;
  var loc = req.body.loc;
  var createdBy = {
    userId: req.user.id,
    name: req.user.name.displayName
  };
  var from =  {
      profileType: PROFILE_TYPE[0], // User Profile
      profileId: req.user.id
  };

  // Validate Inputs
  var message = "";
  if (!sport || !contents || !loc) {
    message = "values for sport, contents, and loc must be provided.";
    return res.send(400, { message: message });
  }
  if (Object.prototype.toString.call(loc) !== '[object Array]' || 
      loc.length !== 2 ||
      !(validator.isNumeric(loc[0]) && validator.isNumeric(loc[1]))) {
    message = "loc must be a form of Number Array with length 2.";
    return res.send(400, { message: message });
  }

  // Sanitize inputs
  contents = validator.escape(contents);

  // Create a new post
  var post = new Post({
    sport: sport,
    createdBy: createdBy,
    contents: contents,
    loc: loc,
    from: from
  });

  post.save(function (err, post) {
    if (err) { return res.send(500); }
    res.send(post);
  });
}

// function update(req, res){

  // var operator = {};
  // var options = {};

  // Post.findByIdAndUpdate(req.params.id, operator, options);
  // console.log(req.params.id);
  // console.log(req.body.comment);
  // res.send("DONE"); 
// }

// function remove(req, res){
  
// }

function addComments(req, res) {
  var postId = req.params.id;
  var text = req.body.text;
  var createdBy = {
    id: req.user.id,
    name: req.user.name.displayName
  };
  if (!text) {
    var message = "string value for text must be provided.";
    return res.send(400, { message: message });
  }
  // sanitize
  text = validator.escape(text);
  var newComment = {
    createdBy: createdBy,
    text: text
  };
  var operator = {
    $push: { comments: newComment },
    $inc: { numComments: 1 }
  };
  var options = {};

  Post.findByIdAndUpdate(postId, operator, options, function(err, post) {
    if (err) { return res.send(500); }

    //TODO: If current user have no acess to this post then return 403
    //  (eg. if post is from private event page and user is not a member of it)

    post = post.toJSON();
    res.send(post.comments);
  });
}

function addScore(req, res) {
  var postId = req.params.id;
  // var commentId = req.query.commentId;

  var query = {
    _id: postId,
    scorers: { $ne: req.user.id }
  };

  var operator = {
    $push: { scorers: req.user.id },
    $inc: { score: 1 }
  };

  Post.findOneAndUpdate(query, operator, function (err, post) {
    if (err) {
      return res.send(500, err);
    }
    //TODO: If current user have no acess to this post then return 403
    //  (eg. if post is from private event page and user is not a member of it)
    if (!post) {
      return res.send(404, { message: "post with postId not exist or post is already scored by current user" });
    }
    res.send(post);
  });
}
function removeScore(req, res) {
  var postId = req.params.id;
  // var commentId = req.query.commentId;

  var query = {
    _id: postId,
    scorers: req.user.id
  };

  var operator = {
    $pull: { scorers: req.user.id },
    $inc: { score: -1 }
  };

  Post.findOneAndUpdate(query, operator, function (err, post) {
    if (err) {
      return res.send(500, err);
    }
    //TODO: If current user have no acess to this post then return 403
    //  (eg. if post is from private event page and user is not a member of it)
    if (!post) {
      return res.send(404, { message: "post with postId not exist or post is not scored by current user" });
    }
    res.send(post);
  });
}

/**
 * Handlers for Socket Connections
 */
function newPost(socket) {
  return function (data, callback) {
    var sport = data.sport;
    var contents = data.contents;
    var loc = data.loc;
    var createdBy = {
      userId: "534995d9df28141ab9f27b8e",
      name: "Jaehwan Ryu"
    };
    var from =  {
        profileType: PROFILE_TYPE[0], // User Profile
        profileId: "534995d9df28141ab9f27b8e"
    };

    // Validate Inputs
    var message = "";
    if (!sport || !contents || !loc) {
      message = "values for sport, contents, and loc must be provided.";
      return callback({ message: message }, null);
    }
    if (Object.prototype.toString.call(loc) !== '[object Array]' || 
        loc.length !== 2 ||
        !(validator.isNumeric(loc[0]) && validator.isNumeric(loc[1]))) {
      message = "loc must be a form of Number Array with length 2.";
      return callback({ message: message }, null);
    }

    // Sanitize inputs
    contents = validator.escape(contents);

    // Create a new post
    var post = new Post({
      sport: sport,
      createdBy: createdBy,
      contents: contents,
      loc: loc,
      from: from
    });

    post.save(function (err, post) {
      if (err) { return callback(err, null); }
      // broadcast to all other clients
      socket.broadcast.emit('newPost', post);
      callback(null, post);
    });
  };
}

// public functions
exports.list = list;
exports.get = get;
exports.create = create;
exports.addComments = addComments;
exports.addScore = addScore;
exports.removeScore = removeScore;
exports.newPost = newPost;