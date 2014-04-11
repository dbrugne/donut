var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');

var Room     = require('./room');
var Role     = require('./role');

var userSchema = mongoose.Schema({

    username       : String,
    name           : String,
    roles          : [Role],
    bio            : String,
    location       : String,
    website        : String,
    avatar         : String,
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