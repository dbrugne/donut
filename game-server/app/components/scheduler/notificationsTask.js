var logger = require('../../../pomelo-logger').getLogger('donut', __filename);
var notifications = require('../notifications');
var _ = require ('underscore');

module.exports = function(data) {
  logger.debug('[schedule:notifications] starting');

  var facade = notifications(data.app);
  facade.retrievePendingNotifications(function(err, notifications){
    if (err)
      return logger.error('[schedule:notifications] error: '+err);

    _.each(notifications, function (notification){
      var type = facade.getType(notification.type);

      if (type != null)
        type.sendEmail(notification);
    });
  });
};