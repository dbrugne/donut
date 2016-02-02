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
  var withUser = session.__user__;
  var event = session.__event__;

  async.waterfall([
    function check (callback) {
      if (!data.event) {
        return callback('params');
      }

      if (!withUser && !event) {
        return callback('not-found');
      }

      if (
        (event.from.id !== user.id && event.to.id !== user.id) ||
        (event.from.id !== withUser.id && event.to.id !== withUser.id)
      ) {
        return callback('not-allowed');
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
