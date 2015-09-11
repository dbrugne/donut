'use strict';
var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var Notifications = require('../../notifications/index');
var _ = require('underscore');

module.exports = {
  send: function (data) {
    logger.trace('notificationsTask.send starting');

    var facade = Notifications(data.app);
    facade.retrieveScheduledNotifications(function (err, notifications) {
      if (err)
        return logger.error('notificationsTask.send error: ' + err);

      logger.trace('notificationsTask.send ' + notifications.length + ' notification(s) to send found');

      _.each(notifications, function (notification) {
        var type = facade.getType(notification.type);
        if (!type)
          return logger.warn('notificationsTask.send unable to identify notification type: ' + notification.type);

        // Send to email
        if (_.isFunction(type.sendEmail) && notification.sent_to_email === false && notification.to_email === true && notification.type !== 'roomallowed' && notification.type !== 'roomjoinrequest')
          type.sendEmail(notification, function (err) {
            if (err)
              return logger.warn('notificationsTask.send sending ' + notification.id + ' error: ' + err);

            return logger.trace('notificationsTask.send ' + notification.id + ' sent');
          });

      // Send to mobile
      // if (_.isFunction(type.sendMobile) && notification.sent_to_mobile === false && notification.to_mobile === true)
      //  type.sendMobile(notification);
      });

      logger.trace('notificationsTask.send done');
    });
  },
  cleanup: function (data) {
    logger.trace('notificationsTask.cleanup starting');
    Notifications(data.app).markOldNotificationsAsDone(function (err, num) {
      if (err)
        return logger.error('notificationsTask.cleanup error: ' + err);

      logger.trace('notificationsTask.cleanup done (' + num + ' updated)');
    });
  }
};
