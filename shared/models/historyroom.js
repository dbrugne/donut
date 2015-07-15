var debug = require('debug')('shared:models:historyRoom');
var _ = require('underscore');
var async = require('async');
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
  viewed        : [{ type: mongoose.Schema.ObjectId, ref: 'User' }],  // users that have read this event
  spammed       : { type: Boolean },
  spammed_at    : { type: Date },
  edited        : { type: Boolean},
  edited_at     : { type: Date }

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

historySchema.methods.toClientJSON = function(userViewed) {
  userViewed = userViewed || false;

  if (!this.room)
    this.room = new Room(); // some rooms was removed (but not their history) before Room.deleted flag introduction

  // record
  var e = {
    type: this.event
  };

  // re-hydrate data
  var data = (this.data)
    ? _.clone(this.data)
    : {};
  data.id = this.id;
  data.name = this.room.name;
  data.room_id = this.room.id;
  data.room_avatar = this.room._avatar();
  data.time = this.time;
  if (this.user) {
    data.user_id = this.user.id;
    data.username = this.user.username;
    data.avatar = this.user._avatar();
  }
  if (this.by_user) {
    data.by_user_id = this.by_user.id;
    data.by_username = this.by_user.username;
    data.by_avatar = this.by_user._avatar();
  }
  if (this.spammed === true)
    e.spammed = this.spammed;
  if (this.edited === true)
    e.edited = this.edited;

  e.data = data;

  // unread status (true if message and if i'm not in .viewed)
  if (userViewed && this.event == 'room:message' && data.user_id != userViewed && (
    !this.viewed
    || (_.isArray(this.viewed) && this.viewed.indexOf(userViewed) === -1)
    )) {
    e.unviewed = true;
  }

  return e;
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
      _.each(entries, function(model) {
        history.push(model.toClientJSON(userId));
      });

      return fn(null, {
        history: history,
        more: more
      });
    });
  }
};

/**
 * Retrieve an history event context and return a JSON representation
 *
 * @param eventId     Event ID to retrieve
 * @param userId      User ID
 * @param limit       Number of maximum event to return in both before and after direction
 * @param timeLimit   Limit of time to retrieve event in both before and after direction
 * @param before      Flag to retrieve (or not) the "before event events"
 * @param fn
 */
historySchema.statics.retrieveEventWithContext = function(eventId, userId, limit, timeLimit, before, fn) {
  if (!eventId)
    return fn('retrieveEventWithContext expect event ID as first parameter');
  if (!userId)
    return fn('retrieveEventWithContext expect user ID as second parameter');

  limit = limit || 5;
  timeLimit = timeLimit || 5; // in mn
  before = before || false;

  var criteria = {
    _id: { $ne: eventId },
    //event: { $nin: ['user:online', 'user:offline'] },
    event: 'room:message',
    users: { $in: [userId] }
  };

  var model;
  var fullResults = [];
  var that = this;
  async.waterfall([

    function retrieveModel(callback) {
      that.findOne({_id: eventId})
        .populate('room', 'name avatar color')
        .populate('user', 'username avatar color facebook')
        .populate('by_user', 'username avatar color facebook')
        .exec(function(err, event) {
          model = event;
          criteria.room = model.room.id;
          fullResults.push(model);
          return callback(err);
        });
    },
    function retrieveAfterEvents(callback) {
      var afterLimit = new Date(model.time);
      afterLimit.setMinutes(afterLimit.getMinutes() + timeLimit);
      var _criteria = _.clone(criteria);
      _criteria.time = {$lte: afterLimit, $gte: model.time};
      that.find(_criteria)
        .sort({time: 'asc'})
        .limit(limit)
        .populate('room', 'name avatar color')
        .populate('user', 'username avatar color facebook')
        .populate('by_user', 'username avatar color facebook')
        .exec(function(err, results) {
          if (err)
            return callback(err);

          fullResults = fullResults.concat(results);
          return callback(null);
        });
    },

    function retrieveBeforeEvents(callback) {
      if (!before)
        return callback(null);

      var beforeLimit = new Date(model.time);
      beforeLimit.setMinutes(beforeLimit.getMinutes() - timeLimit);
      var _criteria = _.clone(criteria);
      _criteria.time = { $gte: beforeLimit, $lte: model.time };
      that.find(_criteria)
        .sort({time: 'desc'})
        .limit(limit)
        .populate('room', 'name avatar color')
        .populate('user', 'username avatar color facebook')
        .populate('by_user', 'username avatar color facebook')
        .exec(function(err, results) {
          if (err)
            return callback(err);

          results.reverse();
          fullResults = results.concat(fullResults);
          return callback(null);
        });
    },

    function prepare(callback) {
      var history = [];
      _.each(fullResults, function(e) {
        history.push(e.toClientJSON(userId));
      });
      return callback(null, history);
    }

  ], function(err, history) {
    fn(err, history);
  });

};

module.exports = mongoose.model('HistoryRoom', historySchema, 'history-room');