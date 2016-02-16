var _ = require('underscore');
var mongoose = require('../io/mongoose')();
var common = require('@dbrugne/donut-common/server');
var cloudinary = require('../util/cloudinary');

var groupSchema = mongoose.Schema({
  name: String,
  default: {type: mongoose.Schema.ObjectId, ref: 'Room'},
  deleted: {type: Boolean, default: false},
  visibility: {type: Boolean, default: false},
  priority: Number,
  owner: {type: mongoose.Schema.ObjectId, ref: 'User'},
  op: [{type: mongoose.Schema.ObjectId, ref: 'User'}],
  allow_user_request: {type: Boolean, default: true},
  allowed: [{type: mongoose.Schema.ObjectId, ref: 'User'}],
  members: [{type: mongoose.Schema.ObjectId, ref: 'User'}],
  members_pending: [{
    user: {type: mongoose.Schema.ObjectId, ref: 'User'},
    message: String,
    created_at: {type: Date, default: Date.now}
  }],
  emails_pending: [{
    user: {type: mongoose.Schema.ObjectId, ref: 'User'},
    email: String,
    created_at: {type: Date, default: Date.now}
  }],
  bans: [{
    user: {type: mongoose.Schema.ObjectId, ref: 'User'},
    reason: String,
    banned_at: {type: Date, default: Date.now}
  }],
  allowed_domains: [{type: String}],
  password: String,
  password_indication: String,
  avatar: String,
  description: String,
  disclaimer: String,
  website: mongoose.Schema.Types.Mixed,
  created_at: {type: Date, default: Date.now},
  last_event_at: {type: Date}
});

groupSchema.statics.getNewGroup = function () {
  var model = new this();
  model.last_event_at = Date.now();
  model.visibility = true;
  model.priority = 0;
  return model;
};

groupSchema.statics.findByName = function (name) {
  return this.findOne({
    name: common.regexp.exact(name, 'i'),
    deleted: {$ne: true}
  });
};

groupSchema.statics.findById = function (id) {
  return this.findOne({
    _id: id,
    deleted: {$ne: true}
  });
};

groupSchema.statics.listByName = function (names) {
  var criteria = {
    deleted: false,
    $or: []
  };
  _.each(names, function (n) {
    criteria['$or'].push({name: common.regexp.exact(n)});
  });
  return this.find(criteria, '_id name');
};

groupSchema.methods.validPassword = function (password) {
  return password === this.password;
};

groupSchema.methods.isIn = function (userId) {
  var subDocument = _.find(this.members, function (users) {
    return (users.id === userId);
  });
  return (typeof subDocument !== 'undefined');
};

groupSchema.methods.isInBanned = function (userId) {
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

groupSchema.methods.isBanned = function (userId) {
  var doc = this.isInBanned(userId);
  return (typeof doc !== 'undefined');
};

groupSchema.methods.isAllowed = function (userId) {
  if (this.isOwner(userId)) {
    return true;
  }

  if (!this.allowed || !this.allowed.length) {
    return false;
  }

  var subDocument = _.find(this.allowed, function (u) {
    if (u._id) {
      return (u.id === userId);
    } else {
      return (u.toString() === userId);
    }
  });
  return (typeof subDocument !== 'undefined');
};

groupSchema.methods.isMember = function (userId) {
  if (this.isOwner(userId)) {
    return true;
  }

  if (!this.members || !this.members.length) {
    return false;
  }

  var subDocument = _.find(this.members, function (u) {
    if (u._id) {
      return (u.id === userId);
    } else {
      return (u.toString() === userId);
    }
  });
  return (typeof subDocument !== 'undefined');
};

groupSchema.methods.isOwner = function (userId) {
  if (!this.owner) {
    return false;
  }

  return (typeof this.owner.toString === 'function' &&
    this.owner.toString() === userId) ||
    (this.owner._id && this.owner.id === userId);
};

groupSchema.methods.isOp = function (userId) {
  if (!this.op.length) {
    return false;
  }

  var subDocument = _.find(this.op, function (u) {
    if (u._id) {
      return (u.id === userId);
    } else {
      return (u.toString() === userId);
    }
  });
  return (typeof subDocument !== 'undefined');
};

groupSchema.methods.isMemberOrOwner = function (userId) {
  return (this.isOwner(userId) || this.isMember(userId));
};

groupSchema.methods.isOwnerOrOp = function (userId) {
  return (this.isOwner(userId) || this.isOp(userId));
};

groupSchema.methods._avatar = function (size) {
  return (this.avatar)
    ? cloudinary.groupAvatar(this.avatar, size)
    : 'group-' + this.id;
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

groupSchema.methods.isAllowedPending = function (userId) {
  if (!this.members_pending.length) {
    return false;
  }

  var subDocument = _.find(this.members_pending, function (doc) {
    if (doc.user._id) {
      return (doc.user.id === userId);
    } else {
      return (doc.user.toString() === userId);
    }
  });
  return (typeof subDocument !== 'undefined');
};

groupSchema.methods.getAllowPendingByUid = function (userId) {
  if (!this.members_pending) {
    return;
  }

  return _.find(this.members_pending, function (doc) {
    if (doc.user._id) {
      return (doc.user.id === userId);
    } else {
      return (doc.user.toString() === userId);
    }
  });
};

groupSchema.methods.isEmailPending = function (email) {
  if (!this.emails_pending.length) {
    return false;
  }

  var subDocument = _.find(this.emails_pending, function (doc) {
    return (doc.email === email);
  });
  return (typeof subDocument !== 'undefined');
};

groupSchema.methods.getIdsByType = function (type) {
  var ids = [];
  var that = this;

  if (type === 'members') {
    _.each(this.members, function (u) {
      if (u._id) {
        ids.push(u._id.toString());
      } else {
        ids.push(u.toString());
      }
    });
    if (this.owner._id) {
      ids.push(this.owner._id.toString());
    } else {
      ids.push(this.owner.toString());
    }
  } else if (type === 'allowed') {
    _.each(this.allowed, function (u) {
      ids.push(u.toString());
    });
  } else if (type === 'pending') {
    _.each(this.members_pending, function (pen) {
      ids.push(pen.user.toString());
    });
  } else if (type === 'op') {
    _.each(this.op, function (u) {
      if (u._id) {
        ids.push(u.id);
      } else {
        ids.push(u.toString());
      }
    });
    if (this.owner._id) {
      ids.push(this.owner._id.toString());
    } else {
      ids.push(this.owner.toString());
    }
  } else if (type === 'regular') {
    _.each(this.members, function (u) {
      if (!that.isOwnerOrOp(u.toString())) {
        ids.push(u.id);
      }
    });
  } else if (type === 'bans') {
    _.each(this.bans, function (ban) {
      ids.push(ban.user.id);
    });
  }
  return ids;
};

groupSchema.methods.countMembers = function () {
  var count = 0;
  count += this.owner ? 1 : 0;
  count += this.members ? this.members.length : 0;
  return count;
};

groupSchema.methods.getIdentifier = function () {
  return '#' + this.name;
};

groupSchema.methods.toClientJSON = function () {
  var data = {
    group_id: this.id,
    identifier: this.getIdentifier(),
    name: this.name,
    avatar: this._avatar(),
    description: this.description,
    members: this.countMembers()
  };

  if (this.owner && this.owner._id) {
    data.owner_id = this.owner.id;
    data.owner_username = this.owner.username;
  }

  return data;
};

module.exports = mongoose.model('Group', groupSchema);
