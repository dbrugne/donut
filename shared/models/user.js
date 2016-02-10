'use strict';
var _ = require('underscore');
var async = require('async');
var mongoose = require('../io/mongoose')();
var bcrypt = require('bcrypt-nodejs');
var common = require('@dbrugne/donut-common/server');
var cloudinary = require('../util/cloudinary');
var RoomModel = require('./room');

var userSchema = mongoose.Schema({
  username: String,
  realname: String,
  emails: [{
    email: {type: String},
    confirmed: {type: Boolean, default: false}
  }],
  admin: {type: Boolean, default: false},
  deleted: {type: Boolean, default: false},
  suspended: {type: Boolean, default: false},
  confirmed: {type: Boolean, default: false},
  bio: String,
  location: String,
  website: mongoose.Schema.Types.Mixed,
  avatar: String,
  poster: String,
  local: {
    email: String,
    password: String,
    resetToken: String,
    resetExpires: Date
  },
  facebook: {
    id: String,
    token: String,
    email: String,
    name: String
  },
  preferences: mongoose.Schema.Types.Mixed,
  ones: [{
    user: {type: mongoose.Schema.ObjectId, ref: 'User'},
    last_event_at: {type: Date},
    last_event: {type: mongoose.Schema.ObjectId, ref: 'HistoryOne'}
  }],
  groups: [{type: mongoose.Schema.ObjectId, ref: 'Group'}],
  blocked: [{
    room: {type: mongoose.Schema.ObjectId, ref: 'Room'},
    why: String,
    reason: String,
    created_at: {type: Date}
  }],
  unviewed: [{
    room: {type: mongoose.Schema.ObjectId, ref: 'Room'},
    user: {type: mongoose.Schema.ObjectId, ref: 'User'},
    event: {type: mongoose.Schema.ObjectId}
  }],
  bans: [{
    user: {type: mongoose.Schema.ObjectId, ref: 'User'},
    banned_at: {type: Date, default: Date.now}
  }],
  devices: [{
    parse_object_id: String,
    created_at: {type: Date},
    updated_at: {type: Date}
  }],
  created_at: {type: Date, default: Date.now},
  lastlogin_at: {type: Date},
  online: Boolean,
  lastonline_at: {type: Date},
  lastoffline_at: {type: Date}
});

/**
 * Return new User instance with some attributes pre-filled with default values
 * @returns {User}
 */
userSchema.statics.getNewUser = function () {
  var model = new this();
  var preferencesConfig = this.preferencesKeys();
  var preferences = {};
  _.each(preferencesConfig, function (value, key) {
    if (key.indexOf('room:') === 0) { // room specific preferences exclusion
      return;
    }
    if (value && value.default === true) {
      preferences[key] = true;
    }
  });
  model.preferences = preferences;

  return model;
};

/**
 * Return the first database user that correspond to username
 * @param username
 * @returns {*}
 */
userSchema.statics.findByUsername = function (username) {
  return this.findOne({
    username: common.regexp.exact(username, 'i')
  });
};

userSchema.statics.listByUsername = function (usernames) {
  var criteria = {
    $or: []
  };
  _.each(usernames, function (u) {
    criteria['$or'].push({username: common.regexp.exact(u)});
  });
  return this.find(criteria, '_id username');
};

userSchema.methods.getEmail = function () {
  if (this.local && this.local.email) {
    return this.local.email;
  }

  if (this.facebook && this.facebook.email) {
    return this.facebook.email;
  }

  return;
};

/**
 * Generating a hash of given password
 * @param password
 * @returns {*}
 */
userSchema.methods.generateHash = function (password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

/**
 * Checks that given 'password' corresponds to stored password
 * @param password
 * @returns {*}
 */
userSchema.methods.validPassword = function (password) {
  return bcrypt.compareSync(password, this.local.password);
};

/**
 * Check that user account is allowed to login
 *
 * @returns {allowed: Boolean, err: String}
 */
userSchema.methods.isAllowedToLogin = function () {
  var err = null;
  if (!this.id) {
    err = 'unknown';
  } else if (this.deleted === true) {
    err = 'deleted';
  }

  return {allowed: (!err), err: err};
};

/**
 * Check that user account is allowed connect to WS
 *
 * @returns {allowed: Boolean, err: String}
 */
userSchema.methods.isAllowedToConnect = function () {
  var connect = this.isAllowedToLogin();
  if (!connect.allowed) {
    return connect;
  }

  var err = null;
  if (this.suspended === true) {
    err = 'suspended';
  }

  return {allowed: (!err), err: err};
};

userSchema.methods.isBanned = function (userId) {
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

/**
 * Return user from database _id
 * @param uid
 * @returns {*}
 */
userSchema.statics.findByUid = function (uid) {
  return this.findOne({_id: uid});
};

/**
 * Look for users required to notify for a topic change. Select only :
 *
 * Users associated to current room
 * AND
 * Users for wich the preference "nothing" is not set AND who wants to be notified, depending of "preference"
 * OR Users for wich the preference "nothing" is set to false AND who wants to be notified, depending of "preference"
 * AND
 * Not the current User
 *
 * @param room
 * @param preferenceName
 * @param userId
 * @param callback
 */
userSchema.statics.findRoomUsersHavingPreference = function (room, preferenceName, userId, callback) {
  var keyNothing = 'preferences.room:notif:nothing:__what__'.replace('__what__', room.id);
  var keyTopic = 'preferences.room:notif:__preference__:__what__'.replace('__preference__', preferenceName).replace('__what__', room.id);

  var criteria = {
    _id: {
      $in: _.map(room.users, function (uid) {
        return uid.toString();
      })
    },
    $and: []
  };

  if (userId !== null) {
    criteria.$and.push({_id: {'$ne': userId}});
  }

  var topicCriterion = {};
  topicCriterion[keyTopic] = true;
  criteria.$and.push(topicCriterion);

  var o1 = {};
  var o2 = {};
  o1[keyNothing] = {'$exists': false};
  o2[keyNothing] = false;

  var nothingCriterion = {$or: []};
  nothingCriterion.$or.push(o1);
  nothingCriterion.$or.push(o2);
  criteria.$and.push(nothingCriterion);

  var q = this.find(
    criteria
  );

  q.exec(callback);
};

/**
 * * Retrieve and return an hydrated user instance
 * @param username
 * @returns {Query}
 */
userSchema.statics.retrieveUser = function (username) {
  return this.findOne({
    username: common.regexp.exact(username, 'i')
  }).populate('room', 'name');
};

/**
 * Find user that have group page open
 * @param groupId
 * @returns {Query}
 */
userSchema.statics.findByGroup = function (groupId) {
  return this.find({groups: {$in: [groupId]}, deleted: {$ne: true}});
};

/** *******************************************************************************
 *
 * Preferences
 *
 *********************************************************************************/

/**
 * List the allowed preferences keys and configurations
 * @returns Object
 */
userSchema.statics.preferencesKeys = function () {
  return {
    'browser:exitpopin': {default: false},
    'browser:welcome': {default: true},
    'browser:sounds': {default: true},
    'notif:channels:desktop': {default: false},
    'notif:channels:email': {default: true},
    'notif:channels:mobile': {default: true},

    'notif:usermessage': {default: true},
    'notif:invite': {default: true},

    'discussion:collapse:__what__': {default: false},

    'room:notif:nothing:__what__': {default: false},
    'room:notif:usermention:__what__': {default: true},
    'room:notif:roompromote:__what__': {default: true},
    'room:notif:roommessage:__what__': {default: false},
    'room:notif:roomtopic:__what__': {default: false}, // set to true for owner on room creation
    'room:notif:roomjoin:__what__': {default: false} // set to true for owner on room creation
  };
};

/**
 * Check if the key is allowed in preferences
 * @param name
 * @returns Boolean
 */
userSchema.statics.preferencesIsKeyAllowed = function (name) {
  var allowed = this.preferencesKeys() || {};
  var keys = Object.keys(allowed);

  // short test (plain keys)
  if (keys.indexOf(name) !== -1) {
    return true;
  }

  // loop test
  var found = _.find(keys, function (key) {
    if (key.indexOf('room:') !== 0 && key.indexOf('discussion:') !== 0) {
      return false;
    } // plain key

    var pattern = new RegExp('^' + key.replace('__what__', ''));
    return pattern.test(name);
  });

  return !!found;
};

/**
 * Return the preferences key value for the current user
 *
 * @param key
 * @returns Mixed
 */
userSchema.methods.preferencesValue = function (key) {
  // preference is set on current user
  if (_.has(this.preferences, key)) {
    return this.preferences[key];
  }

  // not set on user, determine default value
  var _key;
  if (key.indexOf('room:') === 0) {
    // if per-room preferences
    _key = key.substr(0, key.lastIndexOf(':')) + ':__what__';
  } else {
    _key = key;
  }

  var preferencesConfig = this.constructor.preferencesKeys();

  // error in code/configuration
  if (!preferencesConfig || !_.has(preferencesConfig, _key) || !_.has(preferencesConfig[_key], 'default')) {
    return false;
  }

  return preferencesConfig[_key]['default'];
};

userSchema.methods.hasAllowedEmail = function (domains) {
  var found = _.find(this.emails, _.bind(function (e) {
    var domain = '@' + e.email.split('@')[1].toLowerCase();
    return (domains.indexOf(domain) !== -1 && e.confirmed);
  }, this));
  return (typeof found !== 'undefined');
};

/** *******************************************************************************
 *
 * Unviewed
 *
 *********************************************************************************/

userSchema.methods.findRoomFirstUnviewed = function (room) {
  if (!this.unviewed) {
    return;
  }

  var found = _.find(this.unviewed, function (e) {
    if (e.room && e.room.toString() === room.id) {
      return true;
    }
  });
  if (!found) {
    return;
  }
  return found.event;
};
userSchema.methods.findOneFirstUnviewed = function (user) {
  if (!this.unviewed) {
    return;
  }
  var found = _.find(this.unviewed, function (u) {
    if (u.user && u.user.toString() === user.id) {
      return true;
    }
  });
  if (!found) {
    return;
  }
  return found.event;
};
userSchema.statics.setUnviewedRoomMessage = function (roomId, usersId, userId, eventId, fn) {
  this.update({
    _id: {$in: usersId, $nin: [userId]},
    'unviewed.room': {$nin: [roomId]}
  }, {
    $addToSet: {unviewed: {room: roomId, event: eventId}}
  }, {multi: true}, fn);
};
userSchema.statics.setUnviewedOneMessage = function (fromUserId, toUserId, eventId, fn) {
  this.update({
    _id: {$in: [toUserId]},
    'unviewed.user': {$nin: [fromUserId]}
  }, {
    $addToSet: {unviewed: {user: fromUserId, event: eventId}}
  }, fn);
};
userSchema.methods.resetUnviewedRoom = function (roomId, fn) {
  this.update({
    $pull: {unviewed: {room: roomId}}
  }).exec(function (err) {
    fn(err); // there is a bug that cause a timeout when i call directly fn() without warping in a local function (!!!)
  });
};
userSchema.methods.resetUnviewedOne = function (userId, fn) {
  this.update({
    $pull: {unviewed: {user: userId}}
  }).exec(function (err) {
    fn(err); // there is a bug that cause a timeout when i call directly fn() without warping in a local function (!!!)
  });
};
userSchema.statics.unviewedCount = function (userId, fn) {
  var _id;
  if (_.isString(userId)) {
    _id = mongoose.Types.ObjectId(userId);
  } else {
    _id = userId;
  }
  var that = this;
  async.waterfall([
    function roomsIsIn (callback) {
      RoomModel.findByUser(_id).select('_id').exec(function (err, rooms) {
        if (err) {
          return callback(err);
        }

        var roomIds = [];
        if (rooms.length) {
          roomIds = _.map(rooms, 'id');
        }

        return callback(null, roomIds);
      });
    },
    function retrieveUser (roomIds, callback) {
      that.findOne({_id: _id}, 'unviewed ones').exec(function (err, user) {
        if (err) {
          return callback(err);
        }

        var count = 0;
        if (user && user.unviewed && user.unviewed.length) {
          // list open ones
          var oneIds = [];
          if (user.ones) {
            oneIds = _.map(user.ones, function (one) {
              return one.user.toString();
            });
          }

          // count
          _.each(user.unviewed, function (u) {
            if (u.user && oneIds.indexOf(u.user.toString()) !== -1) {
              count = count + 1;
            }
            if (u.room && roomIds.indexOf(u.room.toString()) !== -1) {
              count = count + 1;
            }
          });
        }

        return callback(null, count);
      });
    }
  ], function (err, count) {
    return fn(err, count);
  });
};

/** *******************************************************************************
 *
 * Username availability
 *
 *********************************************************************************/

userSchema.statics.usernameAvailability = function (username, callback) {
  this.findOne({
    username: common.regexp.exact(username, 'i')
  }, function (err, user) {
    if (err) {
      return callback(err);
    }
    if (user) {
      return callback('not-available');
    }

    return callback();
  });
};
userSchema.methods.usernameAvailability = function (username, callback) {
  this.constructor.findOne({
    $and: [
      {
        username: common.regexp.exact(username, 'i')
      },
      {
        _id: {$ne: this._id}
      }
    ]
  }, function (err, user) {
    if (err) {
      return callback(err);
    }
    if (user) {
      return callback('not-available');
    }

    return callback();
  });
};

/** *******************************************************************************
 *
 * Avatar/poster
 *
 *********************************************************************************/

userSchema.methods._avatar = function (size) {
  var facebook = (this.facebook && this.facebook.token && this.facebook.id)
    ? this.facebook.id
    : null;

  if (!this.avatar && !facebook) {
    return 'user-' + this.id;
  } else {
    return cloudinary.userAvatar(this.avatar, facebook, size);
  }
};
userSchema.methods._poster = function (blur) {
  return cloudinary.poster(this.poster, blur);
};
userSchema.methods.avatarId = function () {
  if (!this.avatar) {
    return '';
  }
  var data = this.avatar.split('/');
  if (!data[1]) {
    return '';
  }
  var id = data[1].substr(0, data[1].lastIndexOf('.'));
  return id;
};
userSchema.methods.posterId = function () {
  if (!this.poster) {
    return '';
  }

  var data = this.poster.split('/');
  if (!data[1]) {
    return '';
  }
  var id = data[1].substr(0, data[1].lastIndexOf('.'));
  return id;
};

/** *******************************************************************************
 *
 * Onetoones
 *
 *********************************************************************************/

userSchema.methods.findOnetoone = function (userId) {
  if (!this.ones || !this.ones.length) {
    return;
  }

  return _.find(this.ones, function (onetoone) {
    if (onetoone.user._id) {
       // populated
      return (onetoone.user.id === userId);
    } else {
      return (onetoone.user.toString() === userId);
    }
  });
};
userSchema.methods.isOnetoone = function (userId) {
  var doc = this.findOnetoone(userId);
  return (typeof doc !== 'undefined');
};

/** *******************************************************************************
 *
 * Unviewed
 *
 *********************************************************************************/

userSchema.methods.updateActivity = function (userId, eventId, callback) {
  if (this.isOnetoone(userId.toString())) {
    this.constructor.update(
       {_id: this._id, 'ones.user': userId},
       {$set: {'ones.$.last_event_at': Date.now(), 'ones.$.last_event': eventId}}, callback);
  } else {
    var oneuser = {user: userId, last_event_at: Date.now(), last_event: eventId};
    this.update({$addToSet: {ones: oneuser}}, callback);
  }
};

/** *******************************************************************************
 *
 * Devices
 *
 *********************************************************************************/

userSchema.methods.hasAtLeastOneDevice = function () {
  // @todo : improve by .find() at least one event with .env === conf.parse.env
  return (this.devices && this.devices.length);
};
userSchema.methods.findDevice = function (parseObjectId) {
  if (!this.devices || !this.devices.length) {
    return;
  }
  return _.find(this.devices, function (doc) {
    return (doc.parse_object_id === parseObjectId);
  });
};
userSchema.methods.hasDevice = function (parseObjectId) {
  var doc = this.findDevice(parseObjectId);
  return (typeof doc !== 'undefined');
};
userSchema.methods.registerDevice = function (parseObjectId, callback) {
  if (this.hasDevice(parseObjectId)) {
    this.constructor.update({
      _id: this._id,
      'devices.parse_object_id': parseObjectId
    }, {
      $set: {
        'devices.$.updated_at': Date.now()
      }
    }, function (err) {
      return callback(err);
    });
  } else {
    var device = {
      parse_object_id: parseObjectId,
      created_at: Date.now()
    };
    this.update({$addToSet: {devices: device}}, function (err) {
      return callback(err);
    });
  }
};

/** *******************************************************************************
 *
 * Blocked room
 *
 *********************************************************************************/

userSchema.methods.addBlockedRoom = function (roomId, why, reason, callback) {
  if (this.isRoomBlocked(roomId)) {
    var doc = this.findBlocked(roomId);
    doc.why = why;
    doc.reason = reason;
    doc.created_at = new Date();
    return this.save(function (err) {
      return callback(err);
    });
  }

  this.blocked.push({
    room: roomId,
    why: why,
    reason: reason,
    created_at: new Date()
  });
  this.save(function (err) {
    return callback(err);
  });
};
userSchema.methods.removeBlockedRoom = function (roomId, callback) {
  if (!this.isRoomBlocked(roomId)) {
    return callback(null);
  }

  var doc = this.findBlocked(roomId);
  doc.remove();

  this.save(function (err) {
    return callback(err);
  });
};
userSchema.methods.findBlocked = function (roomId) {
  if (!this.blocked || !this.blocked.length) {
    return;
  }

  return _.find(this.blocked, function (blocked) {
    if (blocked.room._id) {
      // populated
      return (blocked.room.id === roomId);
    } else {
      return (blocked.room.toString() === roomId);
    }
  });
};
userSchema.methods.isRoomBlocked = function (roomId) {
  var doc = this.findBlocked(roomId);
  return (typeof doc !== 'undefined');
};
userSchema.methods.isRoomGroupBanned = function (roomId) {
  if (!this.blocked || !this.blocked.length) {
    return;
  }

  return _.find(this.blocked, function (blocked) {
    if (blocked.room._id) {
      // populated
      return (blocked.room.id === roomId && blocked.why === 'groupban');
    } else {
      return (blocked.room.toString() === roomId && blocked.why === 'groupban');
    }
  });
};

module.exports = mongoose.model('User', userSchema);
