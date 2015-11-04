'use strict';
var logger = require('../../../../shared/util/logger').getLogger('donut', __filename.replace(__dirname + '/', ''));
var _ = require('underscore');
var NotificationModel = require('../../../../shared/models/notification');
var HistoryOne = require('../../../../shared/models/historyone');
var HistoryRoom = require('../../../../shared/models/historyroom');
var RoomModel = require('../../../../shared/models/room');
var conf = require('../../../../config');
var async = require('async');

// notifications logic
var userMessage = require('./types/userMessageType');
var roomPromote = require('./types/roomPromoteType');
var roomRequest = require('./types/roomRequestType');
var roomTopic = require('./types/roomTopicType');
var roomMessage = require('./types/roomMessageType');
var roomJoin = require('./types/roomJoinType');
var userMention = require('./types/userMentionType');
var groupRequest = require('./types/groupRequestType');

module.exports = function (app, options) {
  return new Facade(app, options);
};

var Facade = function (app, options) {
  this.options = _.extend({
    force: false
  }, options || {});
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
    if (err) {
      logger.error('Error while retrieving user status: ' + err);
    }

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
    case 'roomvoice':
    case 'roomdevoice':
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

    case 'roomjoinrequest':
    case 'roomallowed':
    case 'roomrefuse':
    case 'roominvite':
    case 'roomdelete':
    case 'roomcreate':
      typeConstructor = roomRequest;
      break;

    case 'groupjoinrequest':
    case 'groupallowed':
    case 'groupdisallow':
    case 'grouprefuse':
    case 'groupinvite':
    case 'groupban':
    case 'groupdeban':
    case 'groupop':
    case 'groupdeop':
      typeConstructor = groupRequest;
      break;

    default:
      logger.warn('Unknown notification type: ' + type);
      return null;
  }

  var typeObject = typeConstructor(this);
  typeObject.type = type; // allow same file/object for different type (e.g.: promote)
  return typeObject;
};

Facade.prototype.retrieveUserNotifications = function (uid, what, callback) { // @todo yfuks refacto
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
  q.sort({time: -1});

  if (what.number) {
    q.limit(what.number);
  }

  q.populate({
    path: 'user',
    model: 'User',
    select: 'local username color facebook avatar'
  });

  q.exec(function (err, results) {
    if (err) {
      return (err);
    }
    var notifications = [];
    async.eachLimit(results, 1, function (n, fn) {
      if (!n.data) {
        return fn(null);
      }

      if (n.type === 'roomrefuse' || n.type === 'roomallowed' || n.type === 'roomjoinrequest' || n.type === 'roominvite' || n.type === 'roomdelete' || n.type === 'roomcreate') {
        NotificationModel.findOne({_id: n._id})
          .populate({
            path: 'data.user',
            model: 'User',
            select: 'facebook username local avatar color'})
          .populate({
            path: 'data.by_user',
            model: 'User',
            select: 'facebook username local avatar color'})
          .populate({
            path: 'data.room',
            model: 'Room',
            select: 'avatar color name group'})
          .exec(function (err, notification) {
            if (err) {
              return fn(err);
            }
            if (!notification) {
              return fn(null);
            }

            NotificationModel.populate(notification, {
              path: 'data.room.group',
              model: 'Group',
              select: 'name'
            }, function (err, docs) {
              if (err) {
                callback(err);
              }

              n = notification;
              notifications.push(n);
              return fn(null);
            });
          });
      } else if (_.indexOf(['groupjoinrequest', 'grouprefuse', 'groupallowed', 'groupinvite', 'groupban', 'groupdeban', 'groupop', 'groupdeop', 'groupdisallow', 'groupdeban'], n.type) !== -1) {
        NotificationModel.findOne({_id: n._id})
          .populate({
            path: 'data.by_user',
            model: 'User',
            select: 'facebook username local avatar color'})
          .populate({
            path: 'data.group',
            model: 'Group',
            select: 'avatar color name'})
          .exec(function (err, notification) {
            if (err) {
              return fn(err);
            }
            if (!notification) {
              return fn(null);
            }

            n = notification;
            notifications.push(n);
            return fn(null);
          });
      } else if (n.getEventType() === 'historyone') {
        var q = HistoryOne.findOne({_id: n.data.event.toString()})
          .populate('from', 'username avatar color facebook')
          .populate('to', 'username avatar color facebook');
        q.exec(function (err, event) {
          if (err) {
            return fn(err);
          }
          if (!event) {
            return fn(null);
          }

          n.data.event = event;
          notifications.push(n);
          return fn(null);
        });
      } else {
        HistoryRoom.findOne({_id: n.data.event.toString()})
          .populate('user', 'username avatar color facebook')
          .populate('by_user', 'username avatar color facebook')
          .populate('room', 'avatar color name group')
          .exec(function (err, event) {
            if (err) {
              return fn(err);
            }
            if (!event) {
              return fn(null);
            }

            RoomModel.populate(event, {
              path: 'room.group',
              model: 'Group',
              select: 'name'
            }, function (err, docs) {
              if (err) {
                callback(err);
              }

              n.data.event = docs;
              notifications.push(n);
              return fn(null);
            });
          });
      }
    }, function (err) {
      if (err) {
        return callback(err);
      }

      callback(err, notifications);
    });
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

Facade.prototype.retrieveUserNotificationsUnviewedCount = function (uid, callback) {
  NotificationModel.find({
    user: uid,
    done: false,
    viewed: false,
    to_browser: true
  }).count().exec(callback);
};

Facade.prototype.retrieveUserNotificationsCount = function (uid, time, callback) {
  var criteria = {
    user: uid,
    done: false,
    to_browser: true
  };
  if (time !== null) {
    criteria.time = {};
    criteria.time.$lt = new Date(time);
  }
  NotificationModel.find(criteria).count().exec(callback);
};

Facade.prototype.retrieveScheduledNotifications = function (callback) {
  var time = new Date();
  time.setSeconds(time.getSeconds() - conf.notifications.delay);
  var q = NotificationModel.find({
    done: false,
    viewed: false,
    time: {$lt: time},
    $or: [
      {to_email: true, sent_to_email: false}
    ]
  });

  q.populate({
    path: 'user',
    model: 'User',
    select: 'facebook username local avatar color'
  });
  q.populate({
    path: 'data.user',
    model: 'User',
    select: 'facebook username local avatar color'
  });
  q.populate({
    path: 'data.by_user',
    model: 'User',
    select: 'facebook username local avatar color'
  });
  q.populate({
    path: 'data.room',
    model: 'Room',
    select: 'avatar color name group'
  });
  q.populate({
    path: 'data.group',
    model: 'Group',
    select: 'avatar color name'
  });
  q.exec(function (err, results) {
    if (err) {
      callback(err);
    }

    // hydrate room groups (mongoose seems unable to populate populated document)
    var rooms = [];
    var roomsIds = [];
    _.each(results, function (n) {
      if (n.data.room) {
        if (roomsIds.indexOf(n.data.room.id) !== -1) {
          return;
        }
        rooms.push(n.data.room);
        roomsIds.push(n.data.room.id);
      }
    });

    if (!rooms.length) {
      return callback(null, results);
    }

    RoomModel.populate(rooms, {
      path: 'group',
      model: 'Group',
      select: 'name'
    }, function (err, docs) {
      if (err) {
        callback(err);
      }

      callback(null, results);
    });
  });
};

Facade.prototype.markNotificationsAsViewed = function (uid, ids, callback) {
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

Facade.prototype.markNotificationsAsDone = function (uid, ids, callback) {
  NotificationModel.update({
    _id: {$in: ids},
    user: uid
  }, {
    $set: {done: true}
  }, {
    multi: true
  }, function (err, results) {
    return callback(err, results);
  });
};

Facade.prototype.avoidNotificationsSending = function (userId, callback) {
  NotificationModel.update({
    user: userId,
    done: false,
    $or: [
      {to_email: true},
      {to_mobile: true}
    ]
  }, {$set: {to_email: false, to_mobile: false}}, {multi: true}, callback);
};

Facade.prototype.markOldNotificationsAsDone = function (callback) {
  var timeLimit = new Date();
  timeLimit.setMonth(timeLimit.getMonth() - conf.notifications.done);
  NotificationModel.update({
    done: false,
    time: {$lt: timeLimit}
  }, {
    $set: {done: true}
  }, {multi: true}).exec(callback);
};
