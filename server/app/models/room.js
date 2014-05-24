var mongoose = require('mongoose');

var roomSchema = mongoose.Schema({

    name            : String,
    owner_id        : { type: mongoose.Schema.ObjectId, ref: 'User' },
    op              : [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
    bans            : [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
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

roomSchema.statics.findByName = function (name) {
  var regexp = new RegExp(['^',name,'$'].join(''),'i');
  return this.findOne({ name: regexp }, 'name owner_id topic');
}

module.exports = mongoose.model('Room', roomSchema);