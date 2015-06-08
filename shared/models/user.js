var debug = require('debug')('shared:models:user');
var _ = require('underscore');
var mongoose = require('../io/mongoose');
var bcrypt   = require('bcrypt-nodejs');
var colors = require('../../config/colors');
var i18next = require('../util/i18next');

var userSchema = mongoose.Schema({

    username       : String,
    name           : String,
    admin          : { type: Boolean, default: false },
    deleted        : { type: Boolean, default: false },
    suspended      : { type: Boolean, default: false },
    bio            : String,
    location       : String,
    website        : String,
    avatar         : String,
    poster         : String,
    color          : String,
    local            : {
      email         : String,
      password      : String,
      resetToken    : String,
      resetExpires  : Date
    },
    facebook         : {
      id         : String,
      token      : String,
      email      : String,
      name       : String
    },
    preferences    : mongoose.Schema.Types.Mixed,
    rooms          : [{ type: String, ref: 'Room' }], // @todo : store room._id instead of name
    onetoones      : [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
    positions      : { type: String },
    created_at     : { type: Date, default: Date.now },
    lastlogin_at   : { type: Date },
    online         : Boolean,
    lastonline_at  : { type: Date },
    lastoffline_at : { type: Date }

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
  _.each(preferencesConfig, function(value, key) {
    if (key.indexOf('room:') === 0) // room specific preferences exclusion
      return;
    if (value && value.default === true)
      preferences[key] = true;
  });
  model.preferences = preferences;

  return model;
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
userSchema.methods.isAllowedToLogin = function() {
  var err = null;
  if (!this.id)
    err = 'Unable to find authenticating user account';
  else if (this.deleted === true)
    err = 'This user account was deleted';

  return { allowed: (!err), err: err };
};

/**
 * Check that user account is allowed connect to WS
 *
 * @returns {allowed: Boolean, err: String}
 */
userSchema.methods.isAllowedToConnect = function () {
  var connect = this.isAllowedToLogin();
  if (!connect.allowed)
    return connect;

  var err = null;
  if (this.suspended === true)
    err = 'This user account is suspended';
  else if (!this.username)
    err = 'This user account has no username set';

  return { allowed: (!err), err: err };
};

/**
 * Return true if username format is valid or false otherwise
 * @param username
 * @returns {boolean}
 */
userSchema.statics.validateUsername = function (username) {
  // Good length, only allowed chars.
  var pattern = /^[-a-z0-9\._|^]{3,15}$/i;
  if (pattern.test(username)) {
    // Must contains at least one letter or number
    var pattern2 = /[a-z0-9]+/i;
    if (pattern2.test(username)) {
      return true;
    }
  }
  return false;
};

/**
 * Return the first database user that correspond to username
 * @param username
 * @returns {*}
 */
userSchema.statics.findByUsername = function (username) {
  username = ''+username;
  var pattern = username.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
  var regexp = new RegExp('^'+pattern+'$','i');
  return this.findOne({ username: regexp });
};

/**
 * Return user from database _id
 * @param uid
 * @returns {*}
 */
userSchema.statics.findByUid = function (uid) {
  return this.findOne({ _id: uid });
};

/**
 * Retrieve and return an hydrated user instance
 * @param name
 * @returns {Query}
 */
userSchema.statics.retrieveUser = function (username) {
  username = ''+username;
  var pattern = username.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
  var regexp = new RegExp('^'+pattern+'$','i');
  return this.findOne({ username: regexp })
    .populate('room', 'name');
};

/**
 * List the allowed preferences keys and configurations
 * @returns Object
 */
userSchema.statics.preferencesKeys = function () {
  return {
    'browser:welcome': { default: true },
    'browser:sounds': { default: true },
    'notif:channels:desktop': { default: false },
    'notif:channels:email': { default: true },
    'notif:channels:mobile': { default: true },

    'notif:usermessage': { default: true },
    'notif:roominvite': { default: true },

    'room:notif:nothing:__what__': { default: false },
    'room:notif:roommention:__what__': { default: true },
    'room:notif:roompromote:__what__': { default: true },
    'room:notif:roommessage:__what__': { default: false },
    'room:notif:roomtopic:__what__': { default: false }, // set to true for owner on room creation
    'room:notif:roomjoin:__what__': { default: false } // set to true for owner on room creation
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
  if (keys.indexOf(name) !== -1)
    return true;

  // loop test
  var found = _.find(keys, function(key) {
    if (key.indexOf('room:') !== 0)
      return false; // plain key

    var pattern = new RegExp('^'+key.replace('__what__', ''));
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
  if (_.has(this.preferences, key))
    return this.preferences[key];

  // not set on user, determine default value
  var _key;
  if (key.indexOf('room:') === 0) {
    // if per-room preferences
    _key = key.substr(0, key.lastIndexOf(':'))+':__what__';
  } else {
    _key = key;
  }

  var preferencesConfig = this.constructor.preferencesKeys();

  // error in code/configuration
  if (!preferencesConfig || !_.has(preferencesConfig, _key) || !_.has(preferencesConfig[_key], 'default')) {
    debug('Unable to find this preference configuration: '+_key);
    return false;
  }

  return preferencesConfig[_key]['default'];
};

/**
 * Check for username availability (call success)
 * @param username
 * @param success
 * @param error
 */
userSchema.methods.usernameAvailability = function (username, success, error) {
  username = ''+username;
  var pattern = username.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
  var regexp = new RegExp('^'+pattern+'$','i');
  this.constructor.findOne({
    $and: [
      {'username': {$regex: regexp}},
      {_id: { $ne: this._id }}
    ]
  }, function(err, user) {
    if (err) return error('Error while searching existing username: ' + err);
    if (user) return error(i18next.t("choose-username.usernameexists"));

    success();
  });
};

/**
 * Method to get the avatar/poster token used to generated the avatar URL on IHM
 *
 * cloudinary={CLOUDINARY_ID}#!#color={COLOR}[#!#facebook={FACEBOOK_TOKEN}]
 */
userSchema.methods._avatar = function() {
  var token = [];

  if (this.avatar)
    token.push('cloudinary='+this.avatar);

  if (this.color)
    token.push('color='+this.color);

  if (this.facebook && this.facebook.token && this.facebook.id)
    token.push('facebook='+this.facebook.id);

  return token.join('#!#');
};
userSchema.methods._poster = function() {
  var token = [];

  if (this.poster)
    token.push('cloudinary='+this.poster);

  if (this.color)
    token.push('color='+this.color);

  return token.join('#!#');
};

userSchema.methods.avatarId = function() {
  if (!this.avatar) return '';
  var data = this.avatar.split('/');
  if (!data[1]) return '';
  var id = data[1].substr(0, data[1].lastIndexOf('.'));
  return id;
};

userSchema.methods.posterId = function() {
  if (!this.poster)
    return '';

  var data = this.poster.split('/');
  if (!data[1]) return '';
  var id = data[1].substr(0, data[1].lastIndexOf('.'));
  return id;
};

module.exports = mongoose.model('User', userSchema);