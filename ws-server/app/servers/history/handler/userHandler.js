'use strict';
var errors = require('../../../util/errors');
var async = require('async');
var retriever = require('../../../../../shared/models/historyone').retrieve();

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

  async.waterfall([

    function check (callback) {
      if (!data.user_id) {
        return callback('params-user-id');
      }

      if (!withUser) {
        return callback('user-not-found');
      }

      return callback(null);
    },

    function history (callback) {
      var options = {
        since: data.since,
        limit: data.limit
      };
      retriever(user._id, withUser._id, options, function (err, history) {
        if (err) {
          return callback(err);
        }

        var historyEvent = {
          user_id: withUser._id,
          history: history.history,
          more: history.more
        };
        return callback(null, historyEvent);
      });
    }

  ], function (err, historyEvent) {
    if (err) {
      return errors.getHandler('user:history', next)(err);
    }

    next(null, historyEvent);
  });
};
