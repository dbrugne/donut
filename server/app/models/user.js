var mongoose = require('mongoose');
var crate = require("mongoose-crate");
var LocalFS = require("mongoose-crate-localfs");
var ImageMagick = require("mongoose-crate-imagemagick");
var path = require('path');
var bcrypt   = require('bcrypt-nodejs');

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
          original: {
            // keep the original file
          },
          small: {
            resize: "20x20",
            format: ".jpg"
          },
          medium: {
            resize: "50x50",
            format: ".jpg"
          },
          large: {
            resize: "150x150",
            format: ".jpg"
          }
        }
      })
    },
    background: {
      processor: new ImageMagick({
        tmpDir: "medias/tmp",
        formats: ["JPEG", "GIF", "PNG"],
        transforms: {
          original: {
            // keep the original file
          },
          small: {
            resize: "50x50",
            format: ".jpg"
          }
        }
      })
    }
  }
}); // @todo : format should be defined in configuration file

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