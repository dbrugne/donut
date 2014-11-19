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
  received      : Boolean // to user was online at event time
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

    var model = new that();
    model.event       = event;
    model.from        = data.from_user_id;
    model.to          = data.to_user_id;
    model.received    = toIsOnline;
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
   * @param user1 String
   * @param user2 String
   * @param since: the timestamp from when the retrieving will begin (= all events before 'since')
   * @param until: the number of days to go back in past
   * @param fn
   */
  return function(user1, user2, since, until, fn) {
    var criteria = {
      $or: [
        {from: user1, to: user2},
        {from: user2, to: user1}
      ],
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

        var isNew = (entry.received === undefined || entry.received === true) // new : if field not exists or if field === false
          ? false
          : true;

        if (isNew)
          toMarkAsReceived.push(entry._id);

        history.push({
          type: entry.event,
          data: entry.data,
          new: isNew
        });
      });

      that.update({_id: {$in: toMarkAsReceived}}, {$set: {received: true}}, {multi: true}, function(err) {
        if (err)
          return helper.handleError('Error while updating received in historyOne: '+err);
      });

      return fn(null, history);
    });
  }
}

module.exports = mongoose.model('HistoryOne', historySchema, 'history-one');