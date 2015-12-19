'use strict';
var errors = require('../../../util/errors');
var async = require('async');
var _ = require('underscore');
var HistoryOne = require('../../../../../shared/models/historyone');
var pattern = new RegExp('^[0-9a-fA-F]{24}$');

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
        return callback('params-rooms-id');
      }

      if (!withUser) {
        return callback('user-not-found');
      }

      return callback(null);
    },

    function persistOnUser (callback) {
      user.resetUnviewedOne(withUser._id, callback);
    },

    function sendToUserSockets (callback) {
      var viewedEvent = {
        user_id: user._id,
        to_user_id: withUser._id
      };
      that.app.globalChannelService.pushMessage('connector', 'user:viewed', viewedEvent, 'user:' + user.id, {}, callback);
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('user:viewed', next)(err);
    }
    return next(null, { success: true });
  });
};
