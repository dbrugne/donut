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
  /**
   * @param name
   * @param userId
   * @param since: the timestamp from when the retrieving will begin (= all events before 'since')
   * @param until: the number of days to go back in past
   * @param fn
   */
  return function(name, userId, since, until, fn) {
    // Since
    since = since || Date.now(); // from now
    since = new Date(since);

    // Until, floor to  day at 00:00
    until = Date.now() - (1000*3600*24*until);
    var u = new Date(until);
    var until = new Date(u.getFullYear(), u.getMonth(), u.getDate());

    var criteria = {
      name: name,
      time: { $lte: since, $gte: until },
      users: { $in: [userId] },
      event: { $nin: ['user:online', 'user:offline'] }
    };

    var q = that.find(criteria)
      .sort({time: 'desc'})
      .limit(10000); // arbitrary protection, maybe noy helpful

    q.exec(function(err, entries) {
      if (err)
        return fn('Error while retrieving room history: '+err);

      var history = [];
      _.each(entries, function(entry) {
        entry.data.id = entry._id.toString();
        history.push({
          type: entry.event,
          data: entry.data
        });
      });

      // return chronologic list
      history.reverse();

      return fn(null, history);
    });
  }
}

module.exports = mongoose.model('HistoryRoom', historySchema, 'history-room');