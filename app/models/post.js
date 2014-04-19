/**
 * app/models/post.js
 * post model
 */

'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/**
 * Post Schema
 */
var PostSchema = new Schema({

  activated: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  createdBy: {
    name: String,
    id: Schema.Types.ObjectId
  },
  sport: String, // type of sport
  contents: String,
  loc: {type: [Number], index: '2d'}, // [longitude, latitude]

  from: Schema.Types.ObjectId, // eventId if posted from event page
  comments: [{
    activated: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    createdBy: {
      name: String,
      id: Schema.Types.ObjectId
    },
    text: String,
    score: Number,
  }],
  numComments: Number,
  score: Number,
}); 


/**
 * Add toJSON option to transform document before returnig the result
 */
PostSchema.options.toJSON = {
  transform: function (doc, ret, options) {

    // add id feild and remove _id and __v
    ret.id = ret._id;

    delete ret._id;
    delete ret.__v;
  }
};

module.exports = mongoose.model('Post', PostSchema);