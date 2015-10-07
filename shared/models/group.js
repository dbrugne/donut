var _ = require('underscore');
var mongoose = require('../io/mongoose');
var common = require('@dbrugne/donut-common/server');
var cloudinary = require('../util/cloudinary');

var MAX_PASSWORD_TRIES = 5; // @todo sp : move in conf file
var MAX_PASSWORD_TIME = 60 * 1000; // 1mn // @todo sp : move in conf file

var groupSchema = mongoose.Schema({
  name: String,
  default: {type: mongoose.Schema.ObjectId, ref: 'Room'},
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

groupSchema.statics.findById = function (id) {
  return this.findOne({
    _id: id,
    deleted: {$ne: true}
  });
};

groupSchema.methods.isMember = function (userId) {
  if (this.isOwner(userId)) {
    return true;
  }

  if (!this.members || this.members.length) {
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

groupSchema.methods.isOwnerOrOp = function (userId) {
  return (this.isOwner(userId) || this.isOp(userId));
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
  } else if (type === 'pending') {
    _.each(this.members_pending, function (pen) {
      ids.push(pen.user.toString());
    });
  } else if (type === 'op') {
    _.each(this.op, function (u) {
      ids.push(u.toString());
    });
    if (this.owner._id) {
      ids.push(this.owner._id.toString());
    } else {
      ids.push(this.owner.toString());
    }
  } else if (type === 'regular') {
    _.each(this.members, function (u) {
      if (!that.isOwnerOrOp(u.toString())) {
        ids.push(u.toString());
      }
    });
  }
  return ids;
};

groupSchema.methods.count = function () {
  var count = 0;
  count += this.owner ? 1 : 0;
  count += this.op ? this.op.length : 0;
  count += this.members ? this.members.length : 0;
  return count;
};

groupSchema.methods.getIdentifier = function () {
  return '#' + this.name;
};

module.exports = mongoose.model('Group', groupSchema);
