'use strict';
var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var retriever = require('../../../../../shared/models/historyone').retrieve();
var common = require('@dbrugne/donut-common');

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

  var that = this;

  async.waterfall([

    function check (callback) {
      if (!data.user_id) {
        return callback('username is mandatory');
      }

      if (!withUser) {
        return callback('unable to retrieve withUser: ' + data.username);
      }

      return callback(null);
    },

    function history (callback) {
      var options = {
        since: data.since,
        limit: data.limit
      };
      retriever(user._id, withUser._id, options, function (err, history) {
        if (err)
          return callback(err);

        var historyEvent = {
          user_id: withUser._id,
          history: history.history,
          more: history.more
        };
        return callback(null, historyEvent);
      });
    },

  ], function (err, historyEvent) {
    if (err) {
      logger.error('[user:history]' + err);
      return next(null, {code: 500, err: err});
    }

    next(null, historyEvent);
  });

};
