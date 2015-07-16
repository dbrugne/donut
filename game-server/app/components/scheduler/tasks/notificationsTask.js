var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var notifications = require('../../notifications/index');
var _ = require ('underscore');

module.exports = function(data) {
  logger.trace('notificationsTask starting');

  var facade = notifications(data.app);
  facade.retrieveScheduledNotifications(function(err, notifications) {
    if (err)
      return logger.error('notificationsTask error: '+err);

    logger.trace('notificationsTask '+notifications.length+' notification(s) to send found');

    _.each(notifications, function (notification){
      var type = facade.getType(notification.type);
      if (!type)
        return logger.warn('notificationsTask unable to identify notification type: '+notification.type);

      // Send to email
      if (_.isFunction(type.sendEmail) && notification.sent_to_email === false && notification.to_email === true)
        type.sendEmail(notification, function(err) {
          if (err)
            return logger.warn('notificationsTask sending '+notification.id+' error: '+err);

          return logger.trace('notificationsTask '+notification.id+' sent');
        });

      // Send to mobile
      //if (_.isFunction(type.sendMobile) && notification.sent_to_mobile === false && notification.to_mobile === true)
      //  type.sendMobile(notification);
    });

    logger.trace('notificationsTask done');
  });
};