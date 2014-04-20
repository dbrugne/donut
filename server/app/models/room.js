var mongoose = require('mongoose');

var User     = require('./user');

var roomSchema = mongoose.Schema({

    name            : String,
    owner_id        : mongoose.Schema.ObjectId,
    op              : [mongoose.Schema.ObjectId],
    bans            : [mongoose.Schema.ObjectId],
    permanent       : Boolean,
    allow_guests    : Boolean,
    invisible       : Boolean,
    topic           : String,
    description     : String

});

module.exports = mongoose.model('Room', roomSchema);