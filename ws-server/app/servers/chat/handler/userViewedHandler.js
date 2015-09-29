'use strict';
var logger = require('../../../../../shared/util/logger').getLogger('donut', __filename);
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
        return callback('user_id parameter is mandatory');
      }

      if (!data.events || !_.isArray(data.events)) {
        return callback('events parameter is mandatory');
      }

      if (!withUser) {
        return callback('unable to retrieve user: ' + data.username);
      }

      data.events = _.filter(data.events, function (id) {
        // http://stackoverflow.com/questions/11985228/mongodb-node-check-if-objectid-is-valid
        return pattern.test(id);
      });
      if (!data.events.length) {
        return callback('events parameter should contains at least one valid event _id');
      }

      return callback(null);
    },

    function persist (callback) {
      HistoryOne.update({
        _id: {$in: data.events},
        event: {$in: ['user:message']},
        to: user._id
      }, {
        $set: {viewed: true}
      }, {
        multi: true
      }, function (err) {
        return callback(err);
      });
    },

    function persistOnUser (callback) {
      user.resetUnviewedOne(withUser._id, callback);
    },

    function sendToUserSockets (callback) {
      var viewedEvent = {
        from_user_id: user._id,
        to_user_id: withUser._id,
        events: data.events
      };
      that.app.globalChannelService.pushMessage('connector', 'user:viewed', viewedEvent, 'user:' + user.id, {}, callback);
    }

  ], function (err) {
    if (err) {
      logger.error('[user:viewed] ' + err);
    }

    next(err);
  });
};
