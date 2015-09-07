var _ = require('underscore');
var bcrypt = require('bcrypt-nodejs');
var mongoose = require('../io/mongoose');
var common = require('@dbrugne/donut-common');
var cloudinary = require('../util/cloudinary');

var roomSchema = mongoose.Schema({
  name: String,
  permanent: Boolean,
  deleted: {type: Boolean, default: false},
  visibility: {type: Boolean, default: false},
  priority: Number,
  owner: {type: mongoose.Schema.ObjectId, ref: 'User'},
  op: [{type: mongoose.Schema.ObjectId, ref: 'User'}],
  users: [{type: mongoose.Schema.ObjectId, ref: 'User'}],
  bans: [{
    user: {type: mongoose.Schema.ObjectId, ref: 'User'},
    reason: String,
    banned_at: {type: Date, default: Date.now}
  }],
  devoices: [{
    user: {type: mongoose.Schema.ObjectId, ref: 'User'},
    reason: String,
    devoiced_at: {type: Date, default: Date.now}
  }],
  join_mode: {type: String, default: 'everyone'},
  join_mode_password: String,
  join_mode_allowed: [{type: mongoose.Schema.ObjectId, ref: 'User'}],
  history_mode: {type: String, default: 'everyone'},
  avatar: String,
  poster: String,
  color: String,
  topic: String,
  description: String,
  website: mongoose.Schema.Types.Mixed,
  created_at: {type: Date, default: Date.now},
  lastjoin_at: {type: Date}

});

roomSchema.statics.findByName = function (name) {
  return this.findOne({
    name: common.regExpBuildExact(name, 'i'),
    deleted: {$ne: true}
  });
};

roomSchema.statics.listByName = function (names) {
  var criteria = {
    deleted: false,
    $or: []
  };
  _.each(names, function (n) {
    criteria['$or'].push({name: common.regExpBuildExact(n)});
  });
  return this.find(criteria, '_id name');
};

roomSchema.statics.findByUser = function (userId) {
  return this.find({users: {$in: [userId]}, deleted: {$ne: true}});
};

roomSchema.statics.getNewRoom = function () {
  return new this();
};

roomSchema.methods._avatar = function (size) {
  return cloudinary.roomAvatar(this.avatar, this.color, size);
};
roomSchema.methods._poster = function (blur) {
  return cloudinary.poster(this.poster, this.color, blur);
};

roomSchema.methods.avatarId = function () {
  if (!this.avatar) {
    return '';
  }
  var data = this.avatar.split('/');
  if (!data[1]) {
    return '';
  }
  return data[1].substr(0, data[1].lastIndexOf('.'));
};

roomSchema.methods.posterId = function () {
  if (!this.poster) {
    return '';
  }
  var data = this.poster.split('/');
  if (!data[1]) {
    return '';
  }
  return data[1].substr(0, data[1].lastIndexOf('.'));
};

roomSchema.methods.isOwner = function (userId) {
  if (!this.owner) {
    return false;
  }

  return (typeof this.owner.toString === 'function' && this.owner.toString() === userId) ||
    (this.owner._id && this.owner.id === userId);
};

roomSchema.methods.isOp = function (userId) {
  if (!this.op) {
    return false;
  }

  for (var i = 0; i < this.op.length; i++) {
    var u = this.op[i];
    if ((typeof u.toString === 'function' && u.toString() === userId) ||
      (u._id && u._id.toString() === userId)) {
      return true;
    }
  }

  return false;
};

roomSchema.methods.isOwnerOrOp = function (userId) {
  return (this.isOwner(userId) || this.isOp(userId));
};

roomSchema.methods.isBanned = function (userId) {
  if (!this.bans || !this.bans.length) {
    return false;
  }
  var subDocument = _.find(this.bans, function (ban) { // @warning: this shouldn't have .bans populated
    if (ban.user.toString() === userId) {
      return true;
    }
  });

  return (typeof subDocument !== 'undefined');
};

roomSchema.methods.isDevoice = function (userId) {
  if (!this.devoices || !this.devoices.length) {
    return false;
  }
  var subDocument = _.find(this.devoices, function (devoice) { // @warning: this shouldn't have .devoices populated
    return (devoice.user.toString() === userId);
  });

  return (typeof subDocument !== 'undefined');
};

roomSchema.methods.isAllowed = function (userId) {
  var subDocument = _.find(this.join_mode_allowed, function (allowed) {
    return (allowed.toString() === userId);
  });
  return (typeof subDocument !== 'undefined');
};

roomSchema.methods.isIn = function (userId) {
  var subDocument = _.find(this.users, function (users) {
    return (users.toString() === userId);
  });
  return (typeof subDocument !== 'undefined');
};

roomSchema.methods.validPassword = function (password) {
  return bcrypt.compareSync(password, this.join_mode_password);
};

roomSchema.methods.getIdsByType = function (type) {
  if (!type || ['all', 'users', 'op', 'allowed', 'regular', 'ban', 'devoice'].indexOf(type) === -1) {
    return;
  }

  var ids = [];
  if (type === 'all') {
    _.each(this.users, function (u) {
      ids.push(u.toString());
    });
    _.each(this.bans, function (ban) {
      ids.push(ban.user.toString());
    });
  } else if (type === 'users') {
    _.each(this.users, function (u) {
      ids.push(u.toString());
    });
  } else if (type === 'op') {
    _.each(this.op, function (u) {
      ids.push(u.toString());
    });
    ids.push(this.owner.toString());
  } else if (type === 'allowed') {
    _.each(this.join_mode_allowed, function (u) {
      ids.push(u.toString());
    });
  } else if (type === 'regular') {
    var that = this;
    _.each(this.users, function (u) {
      if (!that.isBanned(u.toString()) && !that.isDevoice(u.toString()) && !that.isOwnerOrOp(u.toString())) {
        ids.push(u.toString());
      }
    });
  } else if (type === 'ban') {
    _.each(this.bans, function (ban) {
      ids.push(ban.user.toString());
    });
  } else if (type === 'devoice') {
    _.each(this.devoices, function (devoice) {
      ids.push(devoice.user.toString());
    });
  }
  return ids;
};

module.exports = mongoose.model('Room', roomSchema);
