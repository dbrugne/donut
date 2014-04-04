var mongoose = require('mongoose');

var User     = require('./user');

var roomSchema = mongoose.Schema({

    name            : String,
    owner_id        : User,
    op              : [User],
    bans            : [User],
    permanent       : Boolean,
    allow_guests    : Boolean,
    invisible       : Boolean,
    topic           : String,
    description     : String

});

module.exports = mongoose.model('Room', roomSchema);