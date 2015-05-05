var logger = require('../../../pomelo-logger').getLogger('donut', __filename);
var notifications = require('../notifications');

module.exports = function(data) {
  logger.debug('[schedule:notifications] starting');

  var facade = notifications(data.app);
  //facade.retrievePendingNotifications();
};