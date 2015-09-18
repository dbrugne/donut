'use strict';
var logger = require('../../../../../shared/util/logger').getLogger('donut', __filename);
var async = require('async');
var oneDataHelper = require('../../../util/oneData');

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
      if (!data.username) {
        return callback('username is mandatory');
      }

      if (!withUser) {
        return callback('unable to retrieve withUser: ' + data.username);
      }

      return callback(null);
    },

    function welcome (callback) {
      oneDataHelper(that.app, user, withUser, callback);
    },

    function persist (oneData, callback) {
      // persist on current user
      user.update({$addToSet: { onetoones: withUser._id }}, function (err) {
        return callback(err, oneData);
      });
    },

    function send (oneData, callback) {
      that.app.globalChannelService.pushMessage('connector', 'user:join', oneData, 'user:' + user.id, {}, callback);
    }

  ], function (err) {
    if (err) {
      logger.error('[user:join] ' + err);
      return next(null, { code: 500, err: 'internal' });
    }

    return next(null);
  });
};
