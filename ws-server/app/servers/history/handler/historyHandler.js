'use strict';
var errors = require('../../../util/errors');
var async = require('async');
var _ = require('underscore');
var common = require('@dbrugne/donut-common/server');
var HistoryRoomModel = require('../../../../../shared/models/historyroom');
var HistoryOneModel = require('../../../../../shared/models/historyone');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function (data, session, next) {
  var user = session.__currentUser__;
  var room = session.__room__;
  var one = session.__user__;

  var direction = (data.direction === 'older')
    ? 'older'
    : 'later';
  var limit = data.limit || 100;
  var event = {
    history: []
  };

  async.waterfall([
    function check (callback) {
      if (!data.room_id && !data.user_id) {
        return callback('params');
      }

      if (!room && !one) {
        return callback('not-found');
      }

      if (room && !room.isIn(user.id)) {
        return callback('not-in');
      }

      return callback(null);
    },
    function request (callback) {
      /**
       * We can request a discussion history in following ways:
       * - initial load: last n events from last in desc direction
       * - load more: from 'id' in desc direction
       * - refocus: from last until 'id' in desc direction
       */
      var criteria = {};

      if (data.id && common.validate.objectId(data.id)) {
        var operator = (direction === 'older')
          ? '$lt'
          : '$gt';
        criteria._id = {};
        criteria._id[operator] = data.id;
      }

      var q;
      if (room) {
        event.room_id = room.id;
        criteria.room = room.id;
        q = HistoryRoomModel.find(criteria);
      } else {
        event.user_id = one.id;
        criteria['$or'] = [
          { from: user._id, to: one._id },
          { from: one._id, to: user._id }
        ];
        q = HistoryOneModel.find(criteria);
      }

      q.sort({ _id: 'desc' });
      q.limit(limit + 1);

      // population
      if (room) {
        q.populate('room', 'name')
          .populate('user', 'realname username avatar facebook')
          .populate('by_user', 'realname username avatar facebook');
      } else {
        q.populate('from', 'realname username avatar facebook')
          .populate('to', 'realname username avatar facebook');
      }

      q.exec(callback);
    },
    function history (docs, callback) {
      event.more = (docs.length > limit);
      if (event.more) {
        // remove last
        docs.pop();
      }

      _.each(docs, function (model) {
        event.history.push(model.toClientJSON());
      });

      // events are sent in chronological order
      event.history.reverse();

      return callback(null);
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('history', next)(err);
    }
    next(null, event);
  });
};
