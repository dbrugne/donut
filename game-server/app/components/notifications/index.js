var logger = require('../../../pomelo-logger').getLogger('donut', __filename);
var _ = require('underscore');
var NotificationModel = require('../../../../shared/models/notification');

// notifications logic
var userMessage = require('./userMessageType');
var roomPromote = require('./roomPromoteType');
var roomTopic = require('./roomTopicType');
var roomMessage = require('./roomMessageType');
var roomJoin = require('./roomJoinType');

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


Facade.prototype.create = function(type, subject, data, fn) {
  logger.info('Notification component called: '+type+' for '+(subject.name||subject.username));

  var that = this;
  process.nextTick(function() {
    var t = that.getType(type);
    if (t)
      t.shouldBeCreated(type, subject, data);
  });

  // always return immediately
  if (_.isFunction(fn))
    return fn();
};

/**
 *
 * @param type
 * @returns {*}
 */
Facade.prototype.getType = function(type) {
  var that = this;
  switch(type) {

    case 'usermessage':
      return userMessage(that);
      break;

    case 'roomop':
    case 'roomdeop':
    case 'roomkick':
    case 'roomban':
    case 'roomdeban':
      return roomPromote(that);
      break;

    case 'roomtopic':
      return roomTopic(that);
      break;

    case 'roommessage':
      return roomMessage(that);
      break;

    case 'roomjoin':
      return roomJoin(that);
      break;

    default:
      logger.info('Unknown notification type: '+type);

    return null;
  }
};

Facade.prototype.retrieveUserNotifications = function(uid, what, callback) {
  what = what || {};
  var criteria = {
    user: uid,
    done: false
  };

  if (what.viewed === false) {
    criteria.viewed = false;
  }

  if (what.time !== null) {
    criteria.time = {};
    criteria.time.$lt = new Date(what.time);
  }

  var q = NotificationModel.find(criteria);

  // Only get "number" items
  if (what.number > 0)
    q.limit(what.number);

  q.sort({time: -1});
  q.populate( { path: 'data.user', model: 'User', select: 'username color facebook avatar' } );
  q.populate( { path: 'data.by_user', model: 'User', select: 'username color facebook avatar' } );
  q.populate( { path: 'data.room', model: 'Room', select: 'id name color avatar' } );
  q.exec(function(err, results) {
    callback(err, results);
  });
};

Facade.prototype.retrieveUserNotificationsUnreadCount = function(uid, callback) {
  NotificationModel.find({
    user: uid,
    done: false,
    viewed: false
  }).count().exec(function(err, count) {
    callback(err, count);
  });
};

Facade.prototype.retrievePendingNotifications = function(callback) {
  var time = new Date();
  time.setMinutes(time.getMinutes() - 5);

  var q = NotificationModel.find({
    done: false,
    viewed: false,
    time: { $lt: time },
    $or: [
      { to_browser: true, sent_to_browser: false },
      { to_email: true, sent_to_email: false },
      { to_mobile: true, sent_to_mobile: false }
    ]
  });

  q.populate( { path: 'data.user', model: 'User', select: 'username local' } );
  q.populate( { path: 'data.by_user', model: 'User', select: 'username' } );
  q.populate( { path: 'data.room', model: 'Room', select: 'id name color avatar' } );

  q.exec(function(err, results) {
    if (err)
      callback(err);

    callback(null, results);
  });
};

Facade.prototype.markNotificationsAsRead = function(uid, ids, callback) {
  NotificationModel.update({
    _id: {$in: ids},
    user: uid
  }, {
    $set: {viewed: true}
  }, {
    multi:true
  }, function(err, results) {
    return callback(err, results);
  });
};

Facade.prototype.avoidNotificationsSending = function(uid, ids, callback) {
  NotificationModel.update({
    _id: {$in: ids},
    user: uid
  }, {
    $set: {to_email: false, to_mobile: false}
  }, {
    multi:true
  }, function(err, results) {
    return callback(err, results);
  });
};