'use strict';
var logger = require('../../../../../shared/util/logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var Notifications = require('../../../components/notifications');
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

  var that = this;

  async.waterfall([

    function check (callback) {
      // Mark all as read
      if (data.all) {
        Notifications(that.app).retrieveUserNotificationsUnviewed(user.id, function (err, notifications) {
          if (err) {
            return callback(err);
          }

          return callback(null, notifications);
        });
      } else {
        var notifications = [];
        if (!data.ids || !_.isArray(data.ids)) {
          return callback('ids parameter is mandatory for notifications:viewed');
        }

        // filter array to preserve only valid
        _.each(data.ids, function (elt) {
          if (common.objectIdPattern.test(elt)) {
            notifications.push(elt);
          }
        });

        // test if at least one entry remain
        if (notifications.length === 0) {
          return callback('No notification to set as Read remaining');
        }

        return callback(null, notifications);
      }
    },

    function persist (notifications, callback) {
      Notifications(that.app).markNotificationsAsViewed(user.id, notifications, function (err) {
        return callback(err, notifications);
      });
    },

    function prepare (notifications, callback) {
      // count remaining unviewed notifications
      Notifications(that.app).retrieveUserNotificationsUnviewedCount(user.id, function (err, count) {
        if (err) {
          return callback(err);
        }

        return callback(null, {
          notifications: notifications,
          unviewed: count || 0
        });
      });
    }

  ], function (err, event) {
    if (err) {
      logger.error('[notification:viewed] ' + err);
      return next(null, {code: 500, err: 'internal'});
    }

    next(null, event);
  });
};
