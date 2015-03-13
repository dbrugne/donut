var debug = require('debug')('shared:models:historyOne');
var _ = require('underscore');
var mongoose = require('../io/mongoose');
var User = require('./user');

var historySchema = mongoose.Schema({

  event         : String,
  from          : { type: mongoose.Schema.ObjectId, ref: 'User' },
  to            : { type: mongoose.Schema.ObjectId, ref: 'User' },
  time          : { type: Date, default: Date.now },
  data          : mongoose.Schema.Types.Mixed,
  viewed        : { type: Boolean, default: false }  // true if to user has read this event

});

var dryFields = [
  'time',
  'to',
  'from',
  'from_username',
  'from_user_id',
  'from_avatar',
  'to_user_id',
  'to_username',
]; // in user:online/offline event the fields are user_id, username, avatar

/**
 * Archive following events:
 * - user:message
 * - user:online
 * - user:offline
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
    // user:online/offline special case
    var fromUserId, toUserId;
    if (data.from_user_id == undefined && data.from) {
      fromUserId = data.from;
      toUserId = data.to;
    } else {
      fromUserId = data.from_user_id;
      toUserId = data.to_user_id;
    }

    var model = new that();
    model.event       = event;
    model.from        = fromUserId;
    model.to          = toUserId;
    model.time        = data.time;

    // dry data
    var wet = _.clone(data);
    model.data = _.omit(wet, dryFields) ;

    model.save(function(err) {
      if (err)
        return fn('Unable to save historyOne '+model.from+'=>'+model.to+': '+err);

      return fn(null, model);
    });

  }
};

historySchema.statics.retrieve = function() {
  var that = this;
  var howMany = 100;
  /**
   * @param me String
   * @param other String
   * @param what criteria Object: since (timestamp)
   * @param fn
   */
  return function(me, other, what, fn) {
    what = what || {};
    var criteria = {
      $or: [
        {from: me, to: other},
        {from: other, to: me}
      ],
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
      .populate('from', 'username avatar color facebook')
      .populate('to', 'username avatar color facebook');

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
        // record
        var e = {
          type: entry.event
        };

        // re-hydrate data
        var data = (entry.data)
          ? _.clone(entry.data)
          : {};
        data.id = entry._id.toString();
        data.time = entry.time;
        if (entry.from) {
          data.from_user_id = entry.from._id.toString();
          data.from_username = entry.from.username;
          data.from_avatar = entry.from._avatar();
        }
        if (entry.to) {
          data.to_user_id = entry.to._id.toString();
          data.to_username = entry.to.username;
          data.to_avatar = entry.to._avatar();
        }
        e.data = data;

        // unread status (true if message, i'm the receiver and current value is false)
        if (entry.event == 'user:message' && data.to_user_id == me && !entry.viewed) {
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
};

module.exports = mongoose.model('HistoryOne', historySchema, 'history-one');