var _ = require('underscore');
var mongoose = require('../io/mongoose');
var bcrypt   = require('bcrypt-nodejs');
var colors = require('../config/colors');
var i18next = require('../util/i18next');

var userSchema = mongoose.Schema({

    username        : String,
    name            : String,
    admin           : Boolean,
    bio             : String,
    location        : String,
    website         : String,
    avatar          : String,
    poster          : String,
    color           : String,
    general         : Boolean,
    welcome         : Boolean,
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
    rooms           : [{ type: String, ref: 'Room' }],
    onetoones       : [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
    created_at      : { type: Date, default: Date.now },
    lastlogin_at    : { type: Date },
    online          : Boolean,
    lastonline_at   : { type: Date },
    lastoffline_at  : { type: Date }

});

/**
 * Return new User instance with some attributes pre-filled with default values
 * @returns {User}
 */
userSchema.statics.getNewUser = function () {
  var model = new this();
  var color = _.sample(colors.list);
  model.color = color.hex;
  model.general = true;
  model.welcome = true;
  model.online = false;
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
  var pattern = username.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
  var regexp = new RegExp('^'+pattern+'$','i');
  return this.findOne({ username: regexp });
};

/**
 * Return the first database user that correspond to username
 * @param username
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
  var pattern = username.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
  var regexp = new RegExp('^'+pattern+'$','i');
  return this.findOne({ username: regexp })
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