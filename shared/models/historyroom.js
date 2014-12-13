var debug = require('debug')('shared:models:historyRoom');
var _ = require('underscore');
var mongoose = require('../io/mongoose');
var Room = require('./room');

var historySchema = mongoose.Schema({

  event         : String,
  name          : String,
  time          : { type: Date, default: Date.now },
  user          : { type: mongoose.Schema.ObjectId, ref: 'User' },
  by_user       : { type: mongoose.Schema.ObjectId, ref: 'User' },
  data          : mongoose.Schema.Types.Mixed,
  users         : [{ type: mongoose.Schema.ObjectId, ref: 'User' }], // users in room at event time
  received      : [{ type: mongoose.Schema.ObjectId, ref: 'User' }] // users online at event time
//  viewed        : [{ type: mongoose.Schema.ObjectId, ref: 'User' }]  // users that have "viewed" the event in IHM

});

var dryFields = [
  'time',
  'name',
  'user_id',
  'username',
  'avatar',
  'by_user_id',
  'by_username',
  'by_avatar'
];

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
    var model = new that();
    model.event      = event;
    model.name       = data.name;
    model.time       = data.time;
    model.received   = onlines;

    // persist 'user_id's to be able to hydrate data later
    model.user = data.user_id;
    if (data.by_user_id)
      model.by_user = data.by_user_id;

    // dry data
    var wet = _.clone(data);
    model.data = _.omit(wet, dryFields) ;

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
  var howMany = 100;
  /**
   * @param name
   * @param userId
   * @param what criteria Object: since (timestamp)
   * @param fn
   */
  return function(name, userId, what, fn) {
    what = what || {};
    var criteria = {
      name: name,
      users: { $in: [userId] },
      event: { $nin: ['user:online', 'user:offline'] }
    };

    // Since (timestamp, from present to past direction)
    if (what.since) {
      criteria.time = {};
      criteria.time.$lt = new Date(what.since);
    }

    // limit
    var limit = howMany+1;

    var q = that.find(criteria)
      .sort({time: 'desc'}) // important for timeline logic but also optimize rendering on frontend
      .limit(limit)
      .populate('user', 'username avatar color facebook')
      .populate('by_user', 'username avatar color facebook');

    q.exec(function(err, entries) {
      if (err)
        return fn('Error while retrieving room history: '+err);

      var more = (entries.length > howMany)
        ? true
        : false;
      if (more)
        entries.pop(); // remove last

      var history = [];
      var toMarkAsReceived = [];
      _.each(entries, function(entry) {
        // re-hydrate data
        var data = _.clone(entry.data);
        data.id = entry._id.toString();
        data.name = entry.name;
        data.time = entry.time;
        if (entry.user) {
          data.user_id = entry.user._id.toString();
          data.username = entry.user.username;
          data.avatar = entry.user._avatar();
        }
        if (entry.by_user) {
          data.by_user_id = entry.by_user._id.toString();
          data.by_username = entry.by_user.username;
          data.by_avatar = entry.by_user._avatar();
        }
        entry.data = data;

        // new: received is set and NOT contains 'me'
        var isNew = false;
        if (entry.received !== undefined && entry.received.indexOf(userId) === -1) {
          isNew = true;
          toMarkAsReceived.push(entry._id);
        }

        history.push({
          type: entry.event,
          data: entry.data,
          new: isNew
        });
      });

      that.update({_id: {$in: toMarkAsReceived}}, {$addToSet: {received: userId}}, {multi: true}, function(err) {
        if (err)
          return debug('Error while updating received in historyRoom: '+err);
      });

      return fn(null, {
        history: history,
        more: more
      });
    });
  }
}

module.exports = mongoose.model('HistoryRoom', historySchema, 'history-room');