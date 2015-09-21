'use strict';
var _ = require('underscore');
var mongoose = require('../io/mongoose');
var bcrypt = require('bcrypt-nodejs');
var colors = require('../../config/colors');
var common = require('@dbrugne/donut-common');
var cloudinary = require('../util/cloudinary');

var userSchema = mongoose.Schema({
  username: String,
  name: String,
  admin: {type: Boolean, default: false},
  deleted: {type: Boolean, default: false},
  suspended: {type: Boolean, default: false},
  bio: String,
  location: String,
  website: mongoose.Schema.Types.Mixed,
  avatar: String,
  poster: String,
  color: String,
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
  onetoones: [{type: mongoose.Schema.ObjectId, ref: 'User'}],
  blocked: [{type: mongoose.Schema.ObjectId, ref: 'Room'}],
  unviewed: [{
    room: {type: mongoose.Schema.ObjectId, ref: 'Room'},
    user: {type: mongoose.Schema.ObjectId, ref: 'User'},
    event: {type: mongoose.Schema.ObjectId} // not use actually, first unviewed event, could be use to replace current "heavy" viewed management
  }],
  bans: [{
    user: {type: mongoose.Schema.ObjectId, ref: 'User'},
    banned_at: {type: Date, default: Date.now}
  }],
  positions: {type: String},
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
  var color = _.sample(colors.list);
  model.color = color.hex;

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
    username: common.regExpBuildExact(username, 'i')
  });
};

userSchema.statics.listByUsername = function (usernames) {
  var criteria = {
    $or: []
  };
  _.each(usernames, function (u) {
    criteria['$or'].push({username: common.regExpBuildExact(u)});
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
  } else if (!this.username) {
    err = 'no-username';
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
  var keyNothing = 'preferences.room:notif:nothing:__what__'.replace('__what__', room.name);
  var keyTopic = 'preferences.room:notif:__preference__:__what__'.replace('__preference__', preferenceName).replace('__what__', room.name);

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
    username: common.regExpBuildExact(username, 'i')
  }).populate('room', 'name');
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
    'browser:exitpopin': {default: true},
    'browser:welcome': {default: true},
    'browser:sounds': {default: true},
    'notif:channels:desktop': {default: false},
    'notif:channels:email': {default: true},
    'notif:channels:mobile': {default: true},

    'notif:usermessage': {default: true},
    'notif:roominvite': {default: true},

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
    if (key.indexOf('room:') !== 0) {
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

/** *******************************************************************************
 *
 * Unviewed
 *
 *********************************************************************************/

userSchema.methods.hasUnviewedRoomMessage = function (room) {
  if (!this.unviewed) {
    return false;
  }

  var found = _.find(this.unviewed, function (e) {
    if (e.room && e.room.toString() === room.id) {
      return true;
    }
  });

  return !!found;
};
userSchema.methods.hasUnviewedOneMessage = function (user) {
  if (!this.unviewed) {
    return false;
  }

  var found = _.find(this.unviewed, function (u) {
    if (u.user && u.user.toString() === user.id) {
      return true;
    }
  });

  return !!found;
};
userSchema.statics.setUnviewedRoomMessage = function (roomId, usersId, userId, event, fn) {
  this.update({
    _id: {$in: usersId, $nin: [userId]},
    'unviewed.room': {$nin: [roomId]}
  }, {
    $addToSet: {unviewed: {room: roomId, event: event}}
  }, {multi: true}, fn);
};
userSchema.statics.setUnviewedOneMessage = function (fromUserId, toUserId, event, fn) {
  this.update({
    _id: {$in: [toUserId]},
    'unviewed.user': {$nin: [fromUserId]}
  }, {
    $addToSet: {'unviewed': {user: fromUserId, event: event}}
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

/** *******************************************************************************
 *
 * Username availability
 *
 *********************************************************************************/

userSchema.statics.usernameAvailability = function (username, callback) {
  this.findOne({
    username: common.regExpBuildExact(username, 'i')
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
        username: common.regExpBuildExact(username, 'i')
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

  return cloudinary.userAvatar(this.avatar, this.color, facebook, size);
};
userSchema.methods._poster = function (blur) {
  return cloudinary.poster(this.poster, this.color, blur);
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

module.exports = mongoose.model('User', userSchema);
