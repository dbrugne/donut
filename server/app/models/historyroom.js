var debug = require('debug')('chat-server:history');
var mongoose = require('../mongoose');
var Room = require('./room');

var historySchema = mongoose.Schema({

  event         : String,
  name          : String,
  time          : { type: Date, default: Date.now },
  data          : mongoose.Schema.Types.Mixed,
  users         : [{ type: mongoose.Schema.ObjectId, ref: 'User' }]

});

/**
 * Archive following events:
 * - room:in
 * - room:out
 * - user:online
 * - user:offline
 * - room:message
 * - room:topic
 * - room:op
 * - room:deop
 * - room:kick
 */
historySchema.statics.recorder = function() {
  var that = this;
  return function(event, data) {

    // @todo : purify model.data (remove time, name, avatar, color)

    var model = new that();
    model.event = event;
    model.name  = data.name;
    model.time  = data.time;
    model.data  = data;
    Room.findOne({name: model.name}, 'users', function(err, room) {
      if (err)
        debug('Unable to retrieve room users list '+model.event+' for '+model.name);
      if (!room)
        debug('Room not found '+model.event+' for '+model.name);
      else
        model.users = room.users;

      model.save(function(err) {
        if (err)
          debug('Unable to save roomHistory '+model.event+' for '+model.name);
      })
    });
  }
};

module.exports = mongoose.model('HistoryRoom', historySchema, 'history-room');