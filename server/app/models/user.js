var mongoose = require('mongoose');
var crate = require("mongoose-crate");
var LocalFS = require("mongoose-crate-localfs");
var ImageMagick = require("mongoose-crate-imagemagick");
var path = require('path');
var bcrypt   = require('bcrypt-nodejs');
var configuration = require('../../config/app_dev');

var userSchema = mongoose.Schema({

    username       : String,
    name           : String,
    roles          : [String],
    bio            : String,
    location       : String,
    website        : String,
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
    rooms            : [String]

});

/**
 * Pictures
 */
userSchema.plugin(crate, {
  storage: new LocalFS({
    directory: 'medias/u'
  }),
  fields: {
    avatar: {
      processor: new ImageMagick({
        tmpDir: "medias/tmp",
        formats: ["JPEG", "GIF", "PNG"],
        transforms: {
          original: {},
          small: {
            resize: configuration.pictures.user.avatar.small,
            format: configuration.pictures.format
          },
          medium: {
            resize: configuration.pictures.user.avatar.medium,
            format: configuration.pictures.format
          },
          large: {
            resize: configuration.pictures.user.avatar.large,
            format: configuration.pictures.format
          }
        }
      })
    },
    background: {
      processor: new ImageMagick({
        tmpDir: "medias/tmp",
        formats: ["JPEG", "GIF", "PNG"],
        transforms: {
          original: {},
          medium: {
            resize: configuration.pictures.user.avatar.medium,
            format: configuration.pictures.format
          },
          large: {
            resize: configuration.pictures.user.avatar.large,
            format: configuration.pictures.format
          }
        }
      })
    }
  }
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

// create the model for users and expose it to our app
module.exports = mongoose.model('User', userSchema);