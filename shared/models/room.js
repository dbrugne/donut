var debug = require('debug')('shared:models:room');
var _ = require('underscore');
var mongoose = require('../io/mongoose');
var common = require('@dbrugne/donut-common');
var cloudinary = require('../util/cloudinary');

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
  devoices        : [{
    user: { type: mongoose.Schema.ObjectId, ref: 'User' },
    reason: String,
    devoiced_at: { type: Date, default: Date.now }
  }],
  join_mode       : { type: String, default: 'everyone' },
  join_mode_password: String,
  join_mode_allowed: [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
  history_mode    : { type: String, default: 'everyone' },
  avatar          : String,
  poster          : String,
  color           : String,
  topic           : String,
  description     : String,
  website         : mongoose.Schema.Types.Mixed,
  created_at      : { type: Date, default: Date.now },
  lastjoin_at     : { type: Date }

});

roomSchema.statics.findByName = function (name) {
  return this.findOne({
    name: common.regExpBuildExact(name, 'i'),
    deleted: { $ne: true }
  });
};

roomSchema.statics.listByName = function (names) {
  var criteria = {
    deleted: false,
    $or: []
  };
  _.each(names, function(n) {
    criteria['$or'].push({ name: common.regExpBuildExact(n) });
  });
  return this.find(criteria, '_id name');
};

roomSchema.statics.findByUser = function (userId) {
  return this.find({ users: { $in: [userId] }, deleted: {$ne: true} });
};

roomSchema.statics.getNewRoom = function (data) {
  var model = new this();
  model.name = data.name;
  model.owner = data.owner;
  model.color = data.color;
  model.visibility = data.visibility;
  model.priority = data.priority;
  return model;
};

roomSchema.methods._avatar = function(size) {
  return cloudinary.roomAvatar(this.avatar, this.color, size);
};
roomSchema.methods._poster = function(blur) {
  return cloudinary.poster(this.poster, this.color, blur);
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

roomSchema.methods.isDevoice = function (user_id) {
  if (!this.devoices || !this.devoices.length)
    return false;

  var subDocument = _.find(this.devoices, function (devoice) { // @warning: this shouldn't have .devoices populated
    if (devoice.user.toString() == user_id)
      return true;
  });

  return (typeof subDocument != 'undefined');
};

module.exports = mongoose.model('Room', roomSchema);