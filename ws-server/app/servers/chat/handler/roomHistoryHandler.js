'use strict';
var errors = require('../../../util/errors');
var async = require('async');
var retriever = require('../../../../../shared/models/historyroom').retrieve();

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

  async.waterfall([

    function check (callback) {
      if (!data.room_id) {
        return callback('params-room-id');
      }

      if (!room) {
        return callback('room-not-found');
      }

      if (!room.isIn(user.id)) {
        return callback('no-in');
      }

      return callback(null);
    },

    function history (callback) {
      var options = {
        since: data.since,
        limit: data.limit
      };
      retriever(room.id, user.id, options, function (err, history) {
        if (err) {
          return callback(err);
        }

        var historyEvent = {
          room_id: room.id,
          history: history.history,
          more: history.more
        };
        return callback(null, historyEvent);
      });
    }

  ], function (err, historyEvent) {
    if (err) {
      return errors.getHandler('room:history', next)(err);
    }
    next(null, historyEvent);
  });
};
