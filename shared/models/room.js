var logger = require('../util/logger').getLogger('models', __filename);
var _ = require('underscore');
var mongoose = require('../io/mongoose');
var common = require('@dbrugne/donut-common/server');
var cloudinary = require('../util/cloudinary');
var GroupModel = require('./group');
var conf = require('../../config/index');

var roomSchema = mongoose.Schema({
  name: String,
  group: {type: mongoose.Schema.ObjectId, ref: 'Group'},
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
  mode: {type: String, default: 'public'},
  password: String,
  password_indication: String,
  password_tries: [{
    user: {type: mongoose.Schema.ObjectId, ref: 'User'},
    count: Number,
    created_at: {type: Date, default: Date.now}
  }],
  allow_group_member: {type: Boolean, default: true},
  allow_user_request: {type: Boolean, default: true},
  allowed: [{type: mongoose.Schema.ObjectId, ref: 'User'}],
  allowed_pending: [{
    user: {type: mongoose.Schema.ObjectId, ref: 'User'},
    message: String,
    created_at: {type: Date, default: Date.now}
  }],
  avatar: String,
  poster: String,
  color: String,
  topic: String,
  description: String,
  disclaimer: String,
  website: mongoose.Schema.Types.Mixed,
  created_at: {type: Date, default: Date.now},
  lastjoin_at: {type: Date},
  lastactivity_at: {type: Date}
});

roomSchema.statics.findByName = function (name) {
  return this.findOne({
    name: common.regexp.exact(name, 'i'),
    deleted: {$ne: true}
  }).populate('group', 'name');
};

roomSchema.statics.findById = function (id, callback) {
  return this.findOne({
    _id: id,
    deleted: {$ne: true}
  }).populate('group', 'name')
    .exec(callback);
};

roomSchema.statics.findByNameAndGroup = function (name, groupId) {
  var query = {
    name: common.regexp.exact(name, 'i'),
    deleted: {$ne: true}
  };
  if (groupId) {
    query.group = {$in: groupId};
  } else {
    query.group = {$exists: false};
  }
  return this.findOne(query);
};

roomSchema.statics.findByIdentifier = function (identifier, callback) {
  var data = common.validate.uriExtract(identifier);
  if (!data) {
    return callback('invalid-identifier');
  }

  var that = this;
  var populate = function (err, room) {
    if (err) {
      return callback(err);
    }
    if (!room) {
      return callback(null);
    }
    that.populate(room, [
      {path: 'owner', select: 'username avatar color facebook'},
      {path: 'group', select: 'name members owner'}
    ], callback);
  };

  if (!data.group) {
    // non-group rooms only
    this.findOne({
      name: common.regexp.exact(data.room, 'i'),
      deleted: {$ne: true},
      group: {$exists: false}
    }, populate);
  } else {
    GroupModel.findByName(data.group).exec(function (err, group) {
      if (err) {
        return callback(err);
      }
      if (!group) {
        return callback(null);
      }
      that.findOne({
        group: group._id,
        name: common.regexp.exact(data.room, 'i'),
        deleted: {$ne: true}
      }, populate);
    });
  }
};

roomSchema.statics.findByGroup = function (groupId) {
  return this.find({group: groupId, deleted: {$ne: true}});
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

roomSchema.methods.numberOfUsers = function () {
  return this.users.length;
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

roomSchema.methods.isInBanned = function (userId) {
  if (!this.bans || !this.bans.length) {
    return;
  }

  return _.find(this.bans, function (ban) {
    if (ban.user._id) {
      // populated
      return (ban.user.id === userId);
    } else {
      return (ban.user.toString() === userId);
    }
  });
};

roomSchema.methods.isBanned = function (userId) {
  var doc = this.isInBanned(userId);
  return (typeof doc !== 'undefined');
};

roomSchema.methods.isInGroupBanned = function (userId) {
  if (!this.group || !this.group.bans || !this.group.bans.length) {
    return;
  }

  return _.find(this.group.bans, function (ban) {
    if (ban.user._id) {
      // populated
      return (ban.user.id === userId);
    } else {
      return (ban.user.toString() === userId);
    }
  });
};

roomSchema.methods.isGroupBanned = function (userId) {
  var doc = this.isInGroupBanned(userId);
  return (typeof doc !== 'undefined');
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
  var subDocument = _.find(this.allowed, function (allowed) {
    return (allowed.toString() === userId);
  });

  // check if it's a group member
  if (typeof subDocument === 'undefined' && this.group && this.allow_group_member) {
    return (this.group.isMember(userId));
  } else {
    return (typeof subDocument !== 'undefined');
  }
};

roomSchema.methods.isAllowedPending = function (userId) {
  if (!this.allowed_pending || !this.allowed_pending.length) {
    return false;
  }

  var subDocument = _.find(this.allowed_pending, function (u) {
    return (u.user.toString() === userId);
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
  return password === this.password;
};

roomSchema.methods.isInPasswordTries = function (userId) {
  if (!this.password_tries || !this.password_tries.length) {
    return;
  }

  return _.find(this.password_tries, function (doc) {
    if (doc.user._id) {
      return (doc.user.id === userId);
    } else {
      return (doc.user.toString() === userId);
    }
  });
};

roomSchema.methods.isPasswordTries = function (userId) {
  var doc = this.isInPasswordTries(userId);
  return (typeof doc !== 'undefined');
};

roomSchema.methods.cleanupPasswordTries = function () {
  if (!this.password_tries || !this.password_tries.length) {
    return;
  }
  _.each(this.password_tries, function (doc) {
    if (!doc) {
      return; // strange behavior of mongoose when removing subdocuments
    }
    if ((Date.now() - new Date(doc.created_at)) > conf.room.max_password_time) {
      doc.remove();
    }
  });

  // persistence of removed document will happen later
  this.save(function (err) {
    if (err) {
      logger.error(err);
    }
  });
};

roomSchema.methods.isGoodPassword = function (userId, password) {
  // remove expired subdocs on model synchronously and in database asynchronously
  this.cleanupPasswordTries();
  var tries = this.isInPasswordTries(userId);
  if (tries && tries.count > conf.room.max_password_tries) {
    return 'spam-password';
  }
  if (this.validPassword(password)) {
    return true;
  }
  if (tries) {
    tries.count++;
  } else {
    this.password_tries.push({
      user: userId,
      count: 1
    });
  }
  // persistence will happen later
  this.save(function (err) {
    if (err) {
      logger.error(err);
    }
  });
  return 'wrong-password';
};

roomSchema.methods.isUserBlocked = function (userId, password) {
  if (this.isGroupBanned(userId)) {
    return 'groupbanned';
  }
  if (this.isOwner(userId)) {
    return false;
  }
  if (this.isBanned(userId)) {
    return 'banned';
  }
  if (this.mode === 'public') {
    return false;
  }
  if (this.isAllowed(userId)) {
    return false;
  }
  if (this.group && this.allow_group_member && !this.allow_user_request) {
    return 'group-members-only';
  }
  if (password) {
    return this.isGoodPassword(userId, password);
  }

  return 'notallowed';
};

roomSchema.methods.getAllowPendingByUid = function (userId) {
  if (!this.allowed_pending) {
    return;
  }

  return _.find(this.allowed_pending, function (doc) {
    if (doc.user._id) {
      return (doc.user.id === userId);
    } else {
      return (doc.user.toString() === userId);
    }
  });
};

roomSchema.methods.getIdsByType = function (type) {
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
    if (this.owner._id) {
      ids.push(this.owner.id);
    } else {
      ids.push(this.owner.toString());
    }
  } else if (type === 'allowed') {
    _.each(this.allowed, function (u) {
      ids.push(u.toString());
    });
  } else if (type === 'allowedPending') {
    _.each(this.allowed_pending, function (u) {
      ids.push(u.user.toString());
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

roomSchema.methods.getIdentifier = function () {
  if (!this.group) {
    return '#' + this.name;
  }
  if (this.group.name) {
    return  '#' + this.group.name + '/' + this.name;
  }
};

module.exports = mongoose.model('Room', roomSchema);
