'use strict';
var logger = require('../../../../../shared/util/logger').getLogger('donut', __filename);
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
        return callback('id parameter is mandatory');
      }

      if (!room) {
        return callback('unable to retrieve room: ' + data.room_id);
      }

      if (!room.isIn(user.id)) {
        return callback('user : ' + user.username + ' is not currently in room ' + room.name);
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
      logger.error('[room:history]' + err);
      return next(null, { code: 500, err: 'internal' });
    }

    next(null, historyEvent);
  });

};