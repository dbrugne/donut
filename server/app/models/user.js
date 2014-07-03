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
    rooms            : [{ type: String, ref: 'Room' }],
    onetoones        : [{ type: mongoose.Schema.ObjectId, ref: 'User' }]

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
  var pattern = /^[-a-z0-9_|[\]{}^`]{2,25}$/i;
  if (pattern.test(username)) {
    return true;
  }
  return false;
};

/**
 * Return the first database user that correpsond to username
 * @param username
 * @returns {*}
 */
userSchema.statics.findByUsername = function (username) {
  var regexp = new RegExp(['^',username,'$'].join(''),'i');
  return this.findOne({ username: regexp }, 'username avatar rooms onetoones');
};

/**
 * Check for username availability (call success)
 * @param username
 * @param success
 * @param error
 */
userSchema.methods.usernameAvailability = function (username, success, error) {
  var regexp = new RegExp(['^',username,'$'].join(''),'i');
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
 * @param format
 * @returns {*}
 */
userSchema.methods.avatarId = function() {
  if (!this.avatar) return '';
  var data = this.avatar.split('/');
  if (!data[1]) return '';
  var id = data[1].substr(0, data[1].lastIndexOf('.'));
  return id;
};
userSchema.methods.avatarUrl = function(format) {
  if (!format) format = 'small';
  var options = {};
  options.transformation = 'user-avatar-'+format;

  var cloudinaryId = (this.avatar) ?
    this.avatar
    : this._id.toString();

  return cloudinary.url(cloudinaryId, options);
  // cloudinary handle default image
};

// create the model for users and expose it to our app
module.exports = mongoose.model('User', userSchema);