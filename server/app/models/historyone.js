var debug = require('debug')('donut:server:ws:history');
var _ = require('underscore');
var mongoose = require('../mongoose');
var User = require('./user');

var historySchema = mongoose.Schema({

  event         : String,
  from          : { type: mongoose.Schema.ObjectId, ref: 'User' },
  to            : { type: mongoose.Schema.ObjectId, ref: 'User' },
  time          : { type: Date, default: Date.now },
  data          : mongoose.Schema.Types.Mixed,
  received      : [{ type: mongoose.Schema.ObjectId, ref: 'User' }] // to user was online at event time
//  viewed     : Boolean  // to user have "viewed" the event in IHM

});

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
   * @param toIsOnline - if the current status of the "to" user is online
   * @param fn - callback function
   * @return event with event_id set
   */
  return function(event, data, toIsOnline, fn) {

    // @todo : purify model.data (time, username, avatar, color)

    // user:online/offline special case, @todo : to cleanup later
    var fromUserId, toUserId;
    if (data.from_user_id == undefined && data.from) {
      fromUserId = data.from;
      toUserId = data.to;
    } else {
      fromUserId = data.from_user_id;
      toUserId = data.to_user_id;
    }

    var received = [
      fromUserId
    ];
    if (toIsOnline)
      received.push(toUserId);

    var model = new that();
    model.event       = event;
    model.from        = fromUserId;
    model.to          = toUserId;
    model.received    = received;
    model.time        = data.time;
    model.data        = data;

    model.save(function(err) {
      if (err)
        return fn('Unable to save historyOne '+model.from+'=>'+model.to);

      return fn(null, model);
    });

  }
};

historySchema.statics.retrieve = function() {
  var that = this;
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
    var limit = 250;

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

        // new: received is set and NOT contains 'me'
        var isNew = false;
        if (entry.received !== undefined && entry.received.indexOf(me) === -1) {
          isNew = true;
          toMarkAsReceived.push(entry._id);
        }

        history.push({
          type: entry.event,
          data: entry.data,
          new: isNew
        });
      });

      // me should be a string and not a ObjectId()
      that.update({_id: {$in: toMarkAsReceived}}, {$addToSet: {received: me}}, {multi: true}, function(err) {
        if (err)
          return console.log('Error while updating received in historyOne: '+err);
      });

      return fn(null, history);
    });
  }
}

module.exports = mongoose.model('HistoryOne', historySchema, 'history-one');