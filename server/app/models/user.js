var mongoose = require('mongoose');
var path = require('path');
var bcrypt   = require('bcrypt-nodejs');
var cloudinary = require('../cloudinary');
var configuration = require('../../config/app_dev');

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
        email      : String,
        password   : String
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

// methods ======================
// generating a hash
userSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

// checking if password is valid
userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.local.password);
};

// avatar URL
userSchema.methods.avatarUrl = function(format) {
  if (!this.avatar) return null;

  var options = {crop: 'fill'};
  if (!format) format = 'small';
  options.width = configuration.pictures.user.avatar[format]['width'];
  options.height = configuration.pictures.user.avatar[format]['height'];

  return cloudinary.url(this.avatar, options);
};

// create the model for users and expose it to our app
module.exports = mongoose.model('User', userSchema);