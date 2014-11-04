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
    // Since
    since = since || Date.now(); // from now
    since = new Date(since);

    // Until, floor to  day at 00:00
    until = Date.now() - (1000*3600*24*until);
    var u = new Date(until);
    var until = new Date(u.getFullYear(), u.getMonth(), u.getDate());

    var criteria = {
      time: { $lte: since, $gte: until },
      $or: [
        {from: user1, to: user2},
        {from: user2, to: user1}
      ],
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

module.exports = mongoose.model('HistoryOne', historySchema, 'history-one');