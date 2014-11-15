var debug = require('debug')('chat-server:history');
var _ = require('underscore');
var mongoose = require('../mongoose');
var User = require('./user');

var historySchema = mongoose.Schema({

  event         : String,
  from          : { type: mongoose.Schema.ObjectId, ref: 'User' },
  to            : { type: mongoose.Schema.ObjectId, ref: 'User' },
  time          : { type: Date, default: Date.now },
  data          : mongoose.Schema.Types.Mixed

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
   * @param fn - callback function
   * @return event with event_id set
   */
  return function(event, data, fn) {

    // @todo : purify model.data (remove time, name, avatar, color)

    var model = new that();
    model.event = event;
    model.from  = data.from_user_id;
    model.to  = data.to_user_id;
    model.time  = data.time;
    model.data  = data;

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
      .sort({time: 'desc'})
      .limit(limit);

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

module.exports = mongoose.model('HistoryOne', historySchema, 'history-one');