'use strict';
var logger = require('../../../../../shared/util/logger').getLogger('donut', __filename.replace(__dirname + '/', ''));
var Notifications = require('../../notifications/index');
var _ = require('underscore');
var async = require('async');

module.exports = {
  send: function (data) {
    logger.trace('notificationsTask.send starting');

    var facade = Notifications(data.app);
    facade.retrieveScheduledNotifications(function (err, notifications) {
      if (err) {
        return logger.error('notificationsTask.send error: ' + err);
      }

      logger.trace('notificationsTask.send ' + notifications.length + ' notification(s) to send found');

      async.each(notifications, function (notification, callback) {
        var type = facade.getType(notification.type);
        if (!type) {
          return callback('notificationsTask.send unable to identify notification type', notification.type);
        }

        async.series([
          // Send to email
          function email (cb) {
            if (!_.isFunction(type.sendEmail) || notification.to_email !== true ||
              notification.sent_to_email === true) {
              return cb(null);
            }

            type.sendEmail(notification, cb);
          },
          // Send to mobile
          function mobile (cb) {
            if (!_.isFunction(type.sendMobile) || notification.to_mobile !== true ||
              notification.sent_to_mobile === true) {
              return cb(null);
            }

            type.sendMobile(notification, cb);
          }

        ], callback);
      }, function (err) {
        if (err) {
          logger.error('notificationsTask.send (will mark this notification as done)', err);

          // robustness, if error mark notification as done
          notification.done = true;
          notification.save(function (err) {
            if (err) {
              logger.error('unable to persist notification as done', err);
            }
          });
          return;
        }

        logger.trace('notificationsTask.send done');
      });
    });
  },
  cleanup: function (data) {
    logger.trace('notificationsTask.cleanup starting');
    Notifications(data.app).markOldNotificationsAsDone(function (err, num) {
      if (err) {
        return logger.error('notificationsTask.cleanup error: ' + err);
      }

      logger.trace('notificationsTask.cleanup done (' + num + ' updated)');
    });
  }
};
