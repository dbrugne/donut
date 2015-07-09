var logger = require('../../../pomelo-logger').getLogger('donut', __filename);
var notifications = require('../notifications');
var _ = require ('underscore');

module.exports = function(data) {
  logger.trace('[schedule:notifications] starting');

  var facade = notifications(data.app);
  facade.retrievePendingNotifications(function(err, notifications){ // @todo yls add limiter
    if (err)
      return logger.error('[schedule:notifications] error: '+err);

    _.each(notifications, function (notification){
      var type = facade.getType(notification.type);
      if (type == null)
        return;

      // Send to email
      if (notification.sent_to_email === false && notification.to_email === true)
        type.sendEmail(notification);

      // Send to mobile
      if (notification.sent_to_mobile === false && notification.to_mobile === true)
        type.sendMobile(notification);
    });

    logger.trace('[schedule:notifications] done');
  });
};