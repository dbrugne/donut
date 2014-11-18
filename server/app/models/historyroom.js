var debug = require('debug')('chat-server:history');
var _ = require('underscore');
var mongoose = require('../mongoose');
var Room = require('./room');

var historySchema = mongoose.Schema({

  event         : String,
  name          : String,
  time          : { type: Date, default: Date.now },
  data          : mongoose.Schema.Types.Mixed,
  users         : [{ type: mongoose.Schema.ObjectId, ref: 'User' }], // users in room at event time
  received      : [{ type: mongoose.Schema.ObjectId, ref: 'User' }] // users online at event time
//  viewed        : [{ type: mongoose.Schema.ObjectId, ref: 'User' }]  // users that have "viewed" the event in IHM

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
   * @param onlines - user_id of currently online users for this room
   * @param fn - callback function
   * @return event with event_id set
   */
  return function(event, data, onlines, fn) {

    // @todo : purify model.data (remove time, name, username, avatar, color)

    var model = new that();
    model.event = event;
    model.name  = data.name;
    model.time  = data.time;
    model.data  = data;
    model.received = onlines;
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
    var criteria = {
      name: name,
      users: { $in: [userId] },
      event: { $nin: ['user:online', 'user:offline'] }
    };

    // Since
    if (since) {
      since = since || Date.now(); // from now
      since = new Date(since);
      criteria.time = {};
      criteria.time.$lte = since;
    }

    // Until, floor to  day at 00:00
    if (until) {
      until = Date.now() - (1000*3600*24*until);
      var u = new Date(until);
      var until = new Date(u.getFullYear(), u.getMonth(), u.getDate());
      if (!criteria.time)
        criteria.time = {};
      criteria.time.$gte = until;
    }

    // limit
    var limit = (criteria.time && criteria.time.$lte && criteria.time.$gte)
      ? 10000 // arbitrary
      : 250;

    /**
     * @todo : add index
     * - time (range, sort)
     * - name (filter)
     * - users (filter)
     */

    //console.log(criteria, limit);
    var q = that.find(criteria)
      .sort({time: 'desc'}) // important for timeline logic but also optimize rendering on frontend
      .limit(limit);

    q.exec(function(err, entries) {
      if (err)
        return fn('Error while retrieving room history: '+err);

      var history = [];
      var toMarkAsReceived = [];
      _.each(entries, function(entry) {
        entry.data.id = entry._id.toString();

        var isNew = (entry.received && entry.received.indexOf(userId) === -1)
          ? true
          : false;

        if (isNew)
          toMarkAsReceived.push(entry._id);

        history.push({
          type: entry.event,
          data: entry.data,
          new: isNew
        });
      });

      that.update({_id: {$in: toMarkAsReceived}}, {$addToSet: {received: userId}}, {multi: true}, function(err) {
        if (err)
          return helper.handleError('Error while updating received in historyRoom: '+err);
      });

      return fn(null, history);
    });
  }
}

module.exports = mongoose.model('HistoryRoom', historySchema, 'history-room');