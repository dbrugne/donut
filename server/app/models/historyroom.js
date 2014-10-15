var debug = require('debug')('chat-server:history');
var _ = require('underscore');
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
historySchema.statics.record = function() {
  var that = this;
  /**
   * @param event - event name as String
   * @param data - event data as Object
   * @param fn - callback function
   * @return event with event_id set
   */
  return function(event, data, fn) {

    // @todo : purify model.data (remove time, name, avatar, color)

    var model = new that();
    model.event = event;
    model.name  = data.name;
    model.time  = data.time;
    model.data  = data;
    Room.findOne({name: model.name}, 'users', function(err, room) {
      if (err)
        return fn('Unable to retrieve room users list '+model.event+' for '+model.name);

      if (!room)
        return fn('Room not found '+model.event+' for '+model.name);
      else
        model.users = room.users;

      model.save(function(err) {
        if (err)
          return fn('Unable to save roomHistory '+model.event+' for '+model.name);

        return fn(null, model);
      })
    });
  }
};

historySchema.statics.retrieve = function() {
  var that = this;
  return function(name, userId, since, limit, fn) {
    limit = limit || 15; // 15 last events

    // @todo : implement 'since'

    var q = that.find({
      name: name,
      users: { $in: [userId] }
    })
      .sort({time: 'desc'})
      .limit(limit);

    q.exec(function(err, entries) {
      if (err)
        return fn('Error while retrieving room history: '+err);

      var history = [];
      _.each(entries, function(entry) {
        history.push({
          event: entry.event,
          data: entry.data
        });
      });

      return fn(null, history);
    });
  }
}

module.exports = mongoose.model('HistoryRoom', historySchema, 'history-room');