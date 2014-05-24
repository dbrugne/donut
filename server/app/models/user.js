var mongoose = require('mongoose');
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

userSchema.statics.validateUsername = function (username) {
  var pattern = /^[-a-z0-9_\\|[\]{}^`]{2,30}$/i;
  if (pattern.test(username)) {
    return true;
  }
  return false;
}

// avatar URL
userSchema.methods.avatarUrl = function(format) {
  if (!format) format = 'small';
  var options = {};
  options.transformation = 'user-avatar-'+format;
  return cloudinary.url('avatar-'+this._id.toString(), options);
  // cloudinary handle default image
};

// onetoones list
userSchema.methods.onetoonesList = function() {
  var list = [];
  for (var i=0; i < this.onetoones.length; i++) {
    var u = this.onetoones[i];
    list.push(u.username);
  }
  return list;
};

// create the model for users and expose it to our app
module.exports = mongoose.model('User', userSchema);