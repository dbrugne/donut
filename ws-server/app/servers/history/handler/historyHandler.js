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

  var direction = (data.direction === 'asc')
    ? 'asc'
    : 'desc';
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
       * - initial load: last n events from now in desc direction
       * - load more: from id in desc direction
       * - refocus: from id in asc direction
       */
      var criteria = {};

      if (data.from && common.validate.objectId(data.from)) {
        var operator = (direction === 'desc')
          ? '$lt'
          : '$gt';
        criteria._id = {};
        criteria._id[operator] = data.from;
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

      // important for timeline logic but also optimize rendering on frontend
      q.sort({ _id: direction });
      q.limit(limit + 1);

      // population
      if (room) {
        q.populate('room', 'name')
          .populate('user', 'realname username avatar color facebook')
          .populate('by_user', 'realname username avatar color facebook');
      } else {
        q.populate('from', 'realname username avatar color facebook')
          .populate('to', 'realname username avatar color facebook');
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

      return callback(null);
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('history', next)(err);
    }
    next(null, event);
  });
};
