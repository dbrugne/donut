'use strict';
var logger = require('../../../../../shared/util/logger').getLogger('donut', __filename.replace(__dirname + '/', ''));
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
        return callback('params');
      }

      if (!data.events || !_.isArray(data.events)) {
        return callback('params');
      }

      if (!withUser) {
        return callback('unknown');
      }

      data.events = _.filter(data.events, function (id) {
        // http://stackoverflow.com/questions/11985228/mongodb-node-check-if-objectid-is-valid
        return pattern.test(id);
      });
      if (!data.events.length) {
        return callback('params');
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
      if (err === 'params') {
        logger.warn('[user:viewed] ' + err);
        return next(null, { code: 400, err: err });
      }
      if (err === 'unknown') {
        logger.warn('[user:viewed] ' + err);
        return next(null, { code: 404, err: err });
      }
      logger.error('[user:viewed] ' + err);
      return next(null, { code: 500, err: 'internal' });
    }
    return next(null, { success: true });
  });
};
