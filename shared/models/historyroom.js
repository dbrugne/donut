var debug = require('debug')('shared:models:historyRoom');
var _ = require('underscore');
var mongoose = require('../io/mongoose');
var Room = require('./room');

var historySchema = mongoose.Schema({

  event         : String,
  room          : { type: mongoose.Schema.ObjectId, ref: 'Room' },
  time          : { type: Date, default: Date.now },
  user          : { type: mongoose.Schema.ObjectId, ref: 'User' },
  by_user       : { type: mongoose.Schema.ObjectId, ref: 'User' },
  data          : mongoose.Schema.Types.Mixed,
  users         : [{ type: mongoose.Schema.ObjectId, ref: 'User' }], // users in room at event time
  viewed        : [{ type: mongoose.Schema.ObjectId, ref: 'User' }]  // users that have read this event

}, {strict: false});

var dryFields = [
  'time',
  'name',
  'id',
  'user_id',
  'username',
  'avatar',
  'by_user_id',
  'by_username',
  'by_avatar'
];

/**
 * Archive events
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
    var model = new that();
    model.event      = event;
    model.room       = data.id;
    model.time       = data.time;

    // persist 'user_id's to be able to hydrate data later
    model.user = data.user_id;
    if (data.by_user_id)
      model.by_user = data.by_user_id;

    // dry data
    var wet = _.clone(data);
    model.data = _.omit(wet, dryFields) ;

    Room.findById(data.id, 'users', function(err, room) {
      if (err)
        return fn('Unable to retrieve room users list '+model.event+' for '+data.name);

      if (!room)
        return fn('Room not found '+model.event+' for '+data.name);
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
   * @param roomId
   * @param userId
   * @param what criteria Object: since (timestamp), isAdmin (boolean)
   * @param fn
   */
  return function(roomId, userId, what, fn) {
    what = what || {};
    var criteria = {
      room: roomId,
      event: { $nin: ['user:online', 'user:offline'] }
    };

    if (what.isAdmin !== true) {
      criteria.users = { $in: [userId] };
    }

    // Since (timestamp, from present to past direction)
    if (what.since) {
      criteria.time = {};
      criteria.time.$lt = new Date(what.since);
    }

    // limit
    var howMany = what.limit || 100;
    var limit = howMany + 1;

    var q = that.find(criteria)
      .sort({time: 'desc'}) // important for timeline logic but also optimize rendering on frontend
      .limit(limit)
      .populate('room', 'name')
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
      _.each(entries, function(entry) {
        if (!entry.room)
          entry.room = new Room(); // some rooms was removed (but not their history) before Room.deleted flag introduction

        // record
        var e = {
          type: entry.event
        };

        // re-hydrate data
        var data = (entry.data)
          ? _.clone(entry.data)
          : {};
        data.id = entry._id.toString();
        data.name = entry.room.name;
        data.room_id = entry.room.id;
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
        e.data = data;

        // unread status (true if message and if i'm not in .viewed)
        if (entry.event == 'room:message' && data.user_id != userId && (
            !entry.viewed
            || (_.isArray(entry.viewed) && entry.viewed.indexOf(userId) === -1)
        )) {
          e.unviewed = true;
        }

        history.push(e);
      });

      return fn(null, {
        history: history,
        more: more
      });
    });
  }
}

module.exports = mongoose.model('HistoryRoom', historySchema, 'history-room');