var mongoose = require('mongoose');
var configuration = require('../../config/app_dev');

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

roomSchema.statics.validateName = function (name) {
  var pattern = /^#[-a-z0-9_\\|[\]{}@^`]{2,30}$/i;
  if (pattern.test(name)) {
    return true;
  }
  return false;
}

roomSchema.statics.validateTopic = function (topic) {
  var pattern = /^.{0,200}$/i;
  if (pattern.test(topic)) {
    return true;
  }
  return false;
}

module.exports = mongoose.model('Room', roomSchema);