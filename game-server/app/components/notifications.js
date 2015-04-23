var logger = require('../../pomelo-logger').getLogger('donut', __filename);
var _ = require('underscore');

// notifications logic
var userMessage = require('./notifications/userMessage');
var roomPromote = require('./notifications/roomPromote');

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
