var mongoose = require('../io/mongoose');
var common = require('@dbrugne/donut-common/server');
var cloudinary = require('../util/cloudinary');

var MAX_PASSWORD_TRIES = 5; // @todo sp : move in conf file
var MAX_PASSWORD_TIME = 60 * 1000; // 1mn // @todo sp : move in conf file

var groupSchema = mongoose.Schema({
  name: String,
  deleted: {type: Boolean, default: false},
  visibility: {type: Boolean, default: false},
  priority: Number,
  owner: {type: mongoose.Schema.ObjectId, ref: 'User'},
  op: [{type: mongoose.Schema.ObjectId, ref: 'User'}],
  members: [{type: mongoose.Schema.ObjectId, ref: 'User'}],
  members_pending: [{
    user: {type: mongoose.Schema.ObjectId, ref: 'User'},
    message: String,
    created_at: {type: Date, default: Date.now}
  }],
  password: String,
  password_indication: String,
  avatar: String,
  color: String,
  description: String,
  disclaimer: String,
  website: mongoose.Schema.Types.Mixed,
  created_at: {type: Date, default: Date.now}
});

groupSchema.statics.findByName = function (name) {
  return this.findOne({
    name: common.regexp.exact(name, 'i'),
    deleted: {$ne: true}
  });
};

groupSchema.statics.getNewGroup = function () {
  return new this();
};

groupSchema.methods.isOwner = function (userId) {
  if (!this.owner) {
    return false;
  }

  return (typeof this.owner.toString === 'function' &&
    this.owner.toString() === userId) ||
    (this.owner._id && this.owner.id === userId);
};

groupSchema.methods._avatar = function (size) {
  return cloudinary.roomAvatar(this.avatar, this.color, size);
};

groupSchema.methods.avatarId = function () {
  if (!this.avatar) {
    return '';
  }
  var data = this.avatar.split('/');
  if (!data[1]) {
    return '';
  }
  return data[1].substr(0, data[1].lastIndexOf('.'));
};

module.exports = mongoose.model('Group', groupSchema);
