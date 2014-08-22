var mongoose = require('../mongoose');
var bcrypt   = require('bcrypt-nodejs');
var cloudinary = require('../cloudinary');

var userSchema = mongoose.Schema({

    username       : String,
    name           : String,
    roles          : [String],
    bio            : String,
    location       : String,
    website        : String,
    avatar         : String,
    poster         : String,
    color          : String,
    general        : Boolean,
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
    rooms            : [{ type: String, ref: 'Room' }]

});

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
 * Return true if username format is valid or false otherwise
 * @param username
 * @returns {boolean}
 */
userSchema.statics.validateUsername = function (username) {
  // Good length, only allowed chars.
  var pattern = /^[-a-z0-9\._|[\]^]{3,25}$/i;
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
  var pattern = username.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
  var regexp = new RegExp('^'+pattern+'$','i');
  return this.findOne({ username: regexp }, 'username avatar poster color location website bio rooms');
};

/**
 * Retrieve and return an hydrated user instance
 * @param name
 * @returns {Query}
 */
userSchema.statics.retrieveUser = function (username) {
  var pattern = username.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
  var regexp = new RegExp('^'+pattern+'$','i');
  return this.findOne({ username: regexp }, 'username avatar poster color bio location website rooms')
    .populate('room', 'name');
};

/**
 * Check for username availability (call success)
 * @param username
 * @param success
 * @param error
 */
userSchema.methods.usernameAvailability = function (username, success, error) {
  var pattern = username.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
  var regexp = new RegExp('^'+pattern+'$','i');
  this.constructor.findOne({
    $and: [
      {'username': {$regex: regexp}},
      {_id: { $ne: this._id }}
    ]
  }, function(err, user) {
    if (err) return error('Error while searching existing username: ' + err);
    if (user) return error('This username is already taken by another user');

    success();
  });
};

/**
 * Return avatar URL for the current user
 * @param format (large|medium|small)
 * @returns {*}
 */
userSchema.methods.avatarUrl = function(format) {
  if (!this.avatar)
    return '';

  if (!format) format = 'large';
  var options = {};
  options.transformation = 'user-'+format;

  return cloudinary.url(this.avatar, options);
  // cloudinary handle default image
};

userSchema.methods.avatarId = function() {
  if (!this.avatar) return '';
  var data = this.avatar.split('/');
  if (!data[1]) return '';
  var id = data[1].substr(0, data[1].lastIndexOf('.'));
  return id;
};

/**
 * Return poster URL for the current user
 * @returns {*}
 */
userSchema.methods.posterUrl = function() {
  if (!this.poster)
    return '';

  return cloudinary.url(this.poster, { transformation: 'user-poster' });
  // cloudinary handle default image
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