var logger = require('../../../pomelo-logger').getLogger('donut', __filename);
var _ = require('underscore');
var NotificationModel = require('../../../../shared/models/notification');

// notifications logic
var userMessage = require('./userMessageType');
var roomPromote = require('./roomPromoteType');

module.exports = function(app) {
  return new Facade(app);
};

var Facade = function(app) {
  this.app = app;
};

/**
 * Retrieve uid status
 *
 * @param uid
 * @param fn
 */
Facade.prototype.uidStatus = function(uid, fn) {
  this.app.statusService.getStatusByUid(uid, function(err, status) {
    if (err)
      logger.error('Error while retrieving user status: '+err);

    return fn(!!status);
  });
};

Facade.prototype.create = function(type, user, data, fn) {
  logger.info('Notification component called: '+type+' for '+user.username);

  var that = this;
  process.nextTick(function() {
    switch(type) {

      case 'usermessage':
        userMessage(that).shouldBeCreated(user, data);
        break;

      case 'roomop':
      case 'roomdeop':
      case 'roomkick':
      case 'roomban':
      case 'roomdeban':
        roomPromote(that).shouldBeCreated(type, user, data);
        break;

      default:
        logger.info('Unknown notification type: '+type+' for '+user.username);
    }
  });

  // always return immediately
  if (_.isFunction(fn))
    return fn();
};

Facade.prototype.retrievePendingNotifications = function() {
  NotificationModel.find({
    done: false,
    to_email: true,
    sent_to_email: false,
    to_mobile: true,
    sent_to_mobile: false
  }, function(err, results) {
    console.log(err, results);
  });
};
