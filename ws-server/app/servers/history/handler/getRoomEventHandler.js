'use strict';
var errors = require('../../../util/errors');
var async = require('async');

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
  var event = session.__event__;

  async.waterfall([
    function check (callback) {
      if (!data.event) {
        return callback('params');
      }

      if (!room && !event) {
        return callback('not-found');
      }

      if (room && !room.isIn(user.id)) {
        return callback('not-in');
      }

      return callback(null);
    }
  ], function (err) {
    if (err) {
      return errors.getHandler('history', next)(err);
    }

    next(null, event.toClientJSON());
  });
};
