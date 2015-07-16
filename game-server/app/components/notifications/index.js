var logger = require('../../../pomelo-logger').getLogger('donut', __filename);
var _ = require('underscore');
var NotificationModel = require('../../../../shared/models/notification');
var HistoryOne = require('../../../../shared/models/historyone');
var HistoryRoom = require('../../../../shared/models/historyroom');
var conf = require('../../../../config');
var async = require('async');

// notifications logic
var userMessage = require('./types/userMessageType');
var roomPromote = require('./types/roomPromoteType');
var roomTopic = require('./roomTopicType');
var roomMessage = require('./types/roomMessageType');
var roomJoin = require('./roomJoinType');
var userMention = require('./userMentionType');

module.exports = function (app) {
  return new Facade(app);
};

var Facade = function (app) {
  this.app = app;
};

/**
 * Retrieve uid status
 *
 * @param uid
 * @param fn
 */
Facade.prototype.uidStatus = function (uid, fn) {
  this.app.statusService.getStatusByUid(uid, function (err, status) {
    if (err)
      logger.error('Error while retrieving user status: ' + err);

    return fn(!!status);
  });
};

/**
 *
 * @param type
 * @returns {*}
 */
Facade.prototype.getType = function (type) {
  var typeConstructor;
  switch (type) {

    case 'usermessage':
      typeConstructor = userMessage;
      break;

    case 'roomop':
    case 'roomdeop':
    case 'roomkick':
    case 'roomban':
    case 'roomdeban':
      typeConstructor = roomPromote;
      break;

    case 'roomtopic':
      typeConstructor = roomTopic;
      break;

    case 'roommessage':
      typeConstructor = roomMessage;
      break;

    case 'roomjoin':
      typeConstructor = roomJoin;
      break;

    case 'usermention':
      typeConstructor = userMention;
      break;

    default:
      logger.warn('Unknown notification type: ' + type);
      return null;
  }

  var typeObject = typeConstructor(this);
  typeObject.type = type; // allow same file/object for different type (e.g.: promote)
  return typeObject;
};

Facade.prototype.retrieveUserNotifications = function (uid, what, callback) {
  what = what || {};
  var criteria = {
    user: uid,
    done: false,
    to_browser: true
  };

  if (what.time !== null) {
    criteria.time = {};
    criteria.time.$lt = new Date(what.time);
  }

  var q = NotificationModel.find(criteria);

  // Only get "number" items
  if (what.number > 0)
    q.limit(what.number);

  q.sort({time: -1});
  q.populate({path: 'user', model: 'User', select: 'local username color facebook avatar'});
  q.exec(function (err, results) {
    var notifications = [];

    async.each(results, function (n, fn) {
      switch (n.getEventType()) {
        case 'historyone':
          if (!n.data || !n.data.event)
            return fn(null);
          var q = HistoryOne.findOne({_id: n.data.event.toString()})
            .populate('from', 'username avatar color facebook')
            .populate('to', 'username avatar color facebook');
          q.exec(function (err, event) {
            if (err)
              return fn(err);
            if (!event)
              return fn(null);

            n.data.event = event;
            notifications.push(n);

            return fn(null);
          });
          break;

        case 'historyroom':
          if (!n.data || !n.data.event)
            return fn(null);

          HistoryRoom
            .findOne({_id: n.data.event.toString()})
            .populate('user', 'username avatar color facebook')
            .populate('by_user', 'username avatar color facebook')
            .populate('room', 'avatar color name')
            .exec(function (err, event) {
              if (err)
                return fn(err);
              if (!event)
                return fn(null);

              n.data.event = event;
              notifications.push(n);

              return fn(null);
            });
          break;
        default:
          break;
      }
    }, function (err) {
      callback(err, _.sortBy(notifications, function (n) {
        return -n.time;
      }));
    });
  });
};

Facade.prototype.retrieveUserNotificationsUndoneCount = function (uid, callback) {
  NotificationModel.find({
    user: uid,
    done: false,
    to_browser: true
  }).count().exec(function (err, count) {
    callback(err, count);
  });
};

Facade.prototype.retrieveUserNotificationsUnviewed = function (uid, callback) {
  NotificationModel.find({
    user: uid,
    done: false,
    viewed: false,
    to_browser: true
  }).exec(function (err, results) {
    callback(err, results);
  });
};

Facade.prototype.retrieveUserNotificationsUndoneCount = function (uid, callback) {
  NotificationModel.find({
    user: uid,
    done: false,
    to_browser: true
  }).count().exec(function (err, count) {
    callback(err, count);
  });
};

Facade.prototype.retrieveUserNotificationsUnviewed = function (uid, callback) {
  NotificationModel.find({
    user: uid,
    done: false,
    viewed: false,
    to_browser: true
  }).exec(function (err, results) {
    callback(err, results);
  });
};

Facade.prototype.retrieveUserNotificationsUnreadCount = function (uid, callback) {
  NotificationModel.find({
    user: uid,
    done: false,
    viewed: false,
    to_browser: true
  }).count().exec(function (err, count) {
    callback(err, count);
  });
};

Facade.prototype.retrieveScheduledNotifications = function (callback) {
  var time = new Date();
  time.setSeconds(time.getSeconds() - conf.notifications.delay);

  var q = NotificationModel.find({
    done: false,
    viewed: false,
    time: { $lt: time }, // @todo : add delay before sending email/mobile for each notification type here
    $or: [
      { to_email: true, sent_to_email: false },
      //{ to_mobile: true, sent_to_mobile: false }
    ]
  });

  q.populate({ path: 'user', model: 'User', select: 'facebook username local avatar color' });
  q.exec(function (err, results) {
    if (err)
      callback(err);

    callback(null, results);
  });
};

Facade.prototype.markNotificationsAsRead = function (uid, ids, callback) {
  NotificationModel.update({
    _id: {$in: ids},
    user: uid
  }, {
    $set: {viewed: true}
  }, {
    multi: true
  }, function (err, results) {
    return callback(err, results);
  });
};

Facade.prototype.avoidNotificationsSending = function (uid, ids, callback) {
  NotificationModel.update({
    _id: {$in: ids},
    user: uid
  }, {
    $set: {to_email: false, to_mobile: false}
  }, {
    multi: true
  }, function (err, results) {
    return callback(err, results);
  });
};