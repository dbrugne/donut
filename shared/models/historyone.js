'use strict';
var _ = require('underscore');
var async = require('async');
var mongoose = require('../io/mongoose');
var cloudinary = require('../util/cloudinary');

var historySchema = mongoose.Schema({
  event: String,
  from: { type: mongoose.Schema.ObjectId, ref: 'User' },
  to: { type: mongoose.Schema.ObjectId, ref: 'User' },
  time: { type: Date, default: Date.now },
  data: mongoose.Schema.Types.Mixed,
  viewed: { type: Boolean, default: false }, // true if to user has read this
                                             // event
  edited: { type: Boolean },
  edited_at: { type: Date }

});

var dryFields = [
  'time',
  'to',
  'from',
  'from_username',
  'from_user_id',
  'from_avatar',
  'to_user_id',
  'to_username'
]; // in user:online/offline event the fields are user_id, username, avatar

historySchema.statics.record = function () {
  var Model = this;
  /**
   * @param event - event name as String
   * @param data - event data as Object
   * @param fn - callback function
   * @return event with event_id set
   */
  return function (event, data, fn) {
    // user:online/offline special case
    var fromUserId, toUserId;
    if (data.from_user_id === undefined && data.from) {
      fromUserId = data.from;
      toUserId = data.to;
    } else {
      fromUserId = data.from_user_id;
      toUserId = data.to_user_id;
    }

    var model = new Model();
    model.event = event;
    model.from = fromUserId;
    model.to = toUserId;
    model.time = data.time;

    // dry data
    var wet = _.clone(data);
    model.data = _.omit(wet, dryFields);

    model.save(function (err) {
      if (err) {
        return fn('Unable to save historyOne ' + model.from + '=>' + model.to + ': ' + err);
      }

      return fn(null, model);
    });
  };
};

historySchema.methods.toClientJSON = function (userViewed) {
  userViewed = userViewed || false;

  // record
  var e = {
    type: this.event
  };

  // re-hydrate data
  var data = (this.data)
    ? _.clone(this.data)
    : {};
  data.id = this._id.toString();
  data.time = this.time;
  if (this.from) {
    data.from_user_id = this.from._id.toString();
    data.from_username = this.from.username;
    data.from_avatar = this.from._avatar();
  }
  if (this.to) {
    data.to_user_id = this.to._id.toString();
    data.to_username = this.to.username;
    data.to_avatar = this.to._avatar();
  }
  if (this.edited === true) {
    e.edited = this.edited;
  }

  // images
  if (data.images && data.images.length > 0) {
    data.images = _.map(data.images, function (element, key, value) {
      // @important: use .path to obtain URL with file extension and avoid CORS
      // errors
      return cloudinary.messageImage(element.path);
    });
  }

  e.data = data;

  // unviewed status (true if message, i'm the receiver and current value is
  // false)
  if (userViewed && [ 'user:message' ].indexOf(this.event) !== -1 && data.to_user_id === userViewed && !this.viewed) {
    e.unviewed = true;
  }

  return e;
};

historySchema.statics.retrieve = function () {
  var that = this;
  /**
   * @param me String
   * @param other String
   * @param what criteria Object: since (timestamp)
   * @param fn
   */
  return function (me, other, what, fn) {
    what = what || {};
    var criteria = {
      $or: [
        { from: me, to: other },
        { from: other, to: me }
      ]
    };

    // Since (timestamp, from present to past direction)
    if (what.since) {
      criteria.time = {};
      criteria.time.$lt = new Date(what.since);
    }

    // limit
    var howMany = what.limit || 100;
    var limit = howMany + 1;

    var q = that.find(criteria)
      .sort({ time: 'desc' }) // important for timeline logic but also optimize
                              // rendering on frontend
      .limit(limit)
      .populate('from', 'username avatar color facebook')
      .populate('to', 'username avatar color facebook');

    q.exec(function (err, entries) {
      if (err) {
        return fn('Error while retrieving room history: ' + err);
      }

      var more = (entries.length > howMany);
      if (more) {
        entries.pop();
      } // remove last

      var history = [];
      _.each(entries, function (entry) {
        history.push(entry.toClientJSON(me));
      });

      return fn(null, {
        history: history,
        more: more
      });
    });
  };
};

/**
 * Retrieve an history event context and return a JSON representation
 *
 * @param eventId     Event ID to retrieve
 * @param limit       Number of maximum event to return in both before and
 *   after direction
 * @param timeLimit   Limit of time to retrieve event in both before and after
 *   direction
 * @param before      Flag to retrieve (or not) the "before event events"
 * @param fn
 */
historySchema.statics.retrieveEventWithContext = function (eventId, limit, timeLimit, before, fn) {
  if (!eventId) {
    return fn('retrieveEventWithContext expect event ID as first parameter');
  }

  limit = limit || 5;
  timeLimit = timeLimit || 5; // in mn
  before = before || false;

  var criteria = {
    _id: { $ne: eventId },
    $or: [],
    event: { $in: [ 'user:message' ] }
  };

  var model;
  var fullResults = [];
  var that = this;
  async.waterfall([

    function retrieveModel (callback) {
      that.findOne({ _id: eventId })
        .populate('from', 'username avatar color facebook')
        .populate('to', 'username avatar color facebook')
        .exec(function (err, event) {
          model = event;
          criteria.$or.push({ from: event.from, to: event.to });
          criteria.$or.push({ from: event.to, to: event.from });
          fullResults.push(model);
          return callback(err);
        });
    },
    function retrieveAfterEvents (callback) {
      var afterLimit = new Date(model.time);
      afterLimit.setMinutes(afterLimit.getMinutes() + timeLimit);
      var _criteria = _.clone(criteria);
      _criteria.time = { $lte: afterLimit, $gte: model.time };
      that.find(_criteria)
        .sort({ time: 'asc' })
        .limit(limit)
        .populate('from', 'username avatar color facebook')
        .populate('to', 'username avatar color facebook')
        .exec(function (err, results) {
          if (err) {
            return callback(err);
          }

          fullResults = fullResults.concat(results);
          return callback(null);
        });
    },

    function retrieveBeforeEvents (callback) {
      if (!before) {
        return callback(null);
      }

      var beforeLimit = new Date(model.time);
      beforeLimit.setMinutes(beforeLimit.getMinutes() - timeLimit);
      var _criteria = _.clone(criteria);
      _criteria.time = { $gte: beforeLimit, $lte: model.time };
      that.find(_criteria)
        .sort({ time: 'desc' })
        .limit(limit)
        .populate('from', 'username avatar color facebook')
        .populate('to', 'username avatar color facebook')
        .exec(function (err, results) {
          if (err) {
            return callback(err);
          }

          results.reverse();
          fullResults = results.concat(fullResults);
          return callback(null);
        });
    },

    function prepare (callback) {
      var history = [];
      _.each(fullResults, function (e) {
        history.push(e.toClientJSON());
      });
      return callback(null, history);
    }

  ], function (err, history) {
    fn(err, history);
  });
};

module.exports = mongoose.model('HistoryOne', historySchema, 'history-one');
