var mongoose = require('mongoose');

var roomSchema = mongoose.Schema({

    name            : String,
    owner_id        : String,
    op              : Array,
    bans            : Array,
    permanent       : Boolean,
    allow_guests    : Boolean,
    invisible       : Boolean,
    topic           : String,
    description     : String

});

// create the model and expose it to our app
module.exports = mongoose.model('Room', roomSchema);