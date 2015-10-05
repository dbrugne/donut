var logger = require('../util/logger').getLogger('models', __filename);
var _ = require('underscore');
var mongoose = require('../io/mongoose');
var common = require('@dbrugne/donut-common/server');
var cloudinary = require('../util/cloudinary');
var GroupModel = require('./group');

var MAX_PASSWORD_TRIES = 5; // @todo sp : move in conf file
var MAX_PASSWORD_TIME = 60 * 1000; // 1mn // @todo sp : move in conf file

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
  allow_group_member: Boolean,
  allowed: [{type: mongoose.Schema.ObjectId, ref: 'User'}],
  allowed_pending: [{type: mongoose.Schema.ObjectId, ref: 'User'}],
  avatar: String,
  poster: String,
  color: String,
  topic: String,
  description: String,
  website: mongoose.Schema.Types.Mixed,
  created_at: {type: Date, default: Date.now},
  lastjoin_at: {type: Date},
  lastactivity_at: {type: Date}
});

roomSchema.statics.findByName = function (name) {
  return this.findOne({
    name: common.regexp.exact(name, 'i'),
    deleted: {$ne: true}
  });
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
      {path: 'group', select: 'name'}
    ], callback);
  };

  if (!data.group) {
    // non-group rooms only
    this.findOne({
      name: common.regexp.exact('#' + data.room, 'i'),
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
        name: common.regexp.exact('#' + data.room, 'i'),
        deleted: {$ne: true}
      }, populate);
    });
  }
};

roomSchema.methods.getIdentifier = function () {
  return (!this.group)
    ? '#' + this.name.replace('#', '')
    : '#' + this.group.name + '/' + this.name.replace('#', '')
};

roomSchema.statics.listByName = function (names) {
  var criteria = {
    deleted: false,
    $or: []
  };
  _.each(names, function (n) {
    criteria['$or'].push({name: common.regexp.exact(n)});
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
  return (typeof subDocument !== 'undefined');
};

roomSchema.methods.isAllowedPending = function (userId) {
  var subDocument = _.find(this.allowed_pending, function (u) {
    return (u.toString() === userId);
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
    if ((Date.now() - new Date(doc.created_at)) > MAX_PASSWORD_TIME) {
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

roomSchema.methods.isUserBlocked = function (userId, password) {
  if (this.isOwner(userId)) {
    return false;
  }
  if (this.isBanned(userId)) {
    return 'banned';
  }
  if (this.mode === 'public') {
    return false;
  }
  if (this.isIn(userId)) {
    return false;
  }
  if (this.isAllowed(userId)) {
    return false;
  }
  if (this.password && (password || password === '')) {
    // remove expired subdocs on model synchronously and in database asynchronously
    this.cleanupPasswordTries();
    var tries = this.isInPasswordTries(userId);
    if (tries && tries.count > MAX_PASSWORD_TRIES) {
      return 'spam-password';
    }
    if (this.validPassword(password)) {
      return false;
    }
    if (tries) {
      tries.count ++;
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
  }

  return 'notallowed';
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
    ids.push(this.owner.toString());
  } else if (type === 'allowed') {
    _.each(this.allowed, function (u) {
      ids.push(u.toString());
    });
  } else if (type === 'allowedPending') {
    _.each(this.allowed_pending, function (u) {
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
