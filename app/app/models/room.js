// app/models/room.js
// load the things we need
var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');

// define the schema for our model
var roomSchema = mongoose.Schema({

    name        : String,
    baseline    : String,
    permanent   : Boolean,
    private     : Boolean

});

// methods ======================
// create the model for users and expose it to our app
module.exports = mongoose.model('Room', roomSchema);
