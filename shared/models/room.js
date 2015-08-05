var debug = require('debug')('shared:models:room');
var _ = require('underscore');
var mongoose = require('../io/mongoose');
var regexp = require('../util/regexp');

var roomSchema = mongoose.Schema({

  name            : String,
  permanent       : Boolean,
  deleted         : { type: Boolean, default: false },
  visibility      : { type: Boolean, default: false },
  priority        : Number,
  owner           : { type: mongoose.Schema.ObjectId, ref: 'User' },
  op              : [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
  users           : [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
  bans            : [{
    user: { type: mongoose.Schema.ObjectId, ref: 'User' },
    reason: String,
    banned_at: { type: Date, default: Date.now }
  }],
  avatar          : String,
  poster          : String,
  color           : String,
  topic           : String,
  description     : String,
  website         : String,
  created_at      : { type: Date, default: Date.now },
  lastjoin_at     : { type: Date }

});

roomSchema.statics.findByName = function (name) {
  return this.findOne({
    name: regexp.buildExclusive(name, 'i'),
    deleted: { $ne: true }
  });
};

roomSchema.statics.listByName = function (names) {
  var criteria = {
    $or: []
  };
  _.each(names, function(n) {
    criteria['$or'].push({ name: regexp.buildExclusive(n) });
  });
  return this.find(criteria, '_id name');
};

roomSchema.statics.findByUser = function (userId) {
  return this.find({ users: { $in: [userId] }, deleted: {$ne: true} });
};

/**
 * Method to get the avatar/poster token used to generated the avatar URL on IHM
 *
 * cloudinary={CLOUDINARY_ID}#!#color={COLOR}[#!#facebook={FACEBOOK_TOKEN}]
 */
roomSchema.methods._avatar = function() {
  var token = [];

  if (this.avatar)
    token.push('cloudinary='+this.avatar);

  if (this.color)
    token.push('color='+this.color);

  return token.join('#!#');
};
roomSchema.methods._poster = function() {
  var token = [];

  if (this.poster)
    token.push('cloudinary='+this.poster);

  if (this.color)
    token.push('color='+this.color);

  return token.join('#!#');
};

roomSchema.methods.avatarId = function() {
  if (!this.avatar) return '';
  var data = this.avatar.split('/');
  if (!data[1]) return '';
  var id = data[1].substr(0, data[1].lastIndexOf('.'));
  return id;
};

roomSchema.methods.posterId = function() {
  if (!this.poster) return '';
  var data = this.poster.split('/');
  if (!data[1]) return '';
  var id = data[1].substr(0, data[1].lastIndexOf('.'));
  return id;
};

roomSchema.methods.isOwner = function(user_id) {
  if (!this.owner)
    return false;

  if (
    (typeof this.owner.toString == 'function' && this.owner.toString() == user_id) // dry
    || (this.owner._id && this.owner._id.toString() == user_id) // hydrated
  ) return true;

  return false;
};

roomSchema.methods.isOp = function(user_id) {
  if (!this.op)
    return false;

  for (var i=0; i<this.op.length; i++) {
    var u = this.op[i];
    if (
      (typeof u.toString == 'function' && u.toString() == user_id) // dry
      || (u._id && u._id.toString() == user_id) // hydrated
    ) return true;
  }

  return false;
};

roomSchema.methods.isOwnerOrOp = function(user_id) {
  if (this.isOwner(user_id) || this.isOp(user_id))
    return true;

  return false;
};

roomSchema.methods.isBanned = function(user_id) {
  if (!this.bans || !this.bans.length)
    return false;

  var subDocument = _.find(this.bans, function(ban) { // @warning: this shouldn't have .bans populated
    if (ban.user.toString() == user_id)
      return true;
  });

  return (typeof subDocument != 'undefined');
};

module.exports = mongoose.model('Room', roomSchema);