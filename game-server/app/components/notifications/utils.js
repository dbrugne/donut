var logger = require('../../../pomelo-logger').getLogger('donut', __filename);
var _ = require('underscore');
var NotificationModel = require('../../../../shared/models/notification');
var UserModel = require('../../../../shared/models/user');
var RoomModel = require('../../../../shared/models/room');
var HistoryOneModel = require('../../../../shared/models/historyone');
var HistoryRoomModel = require('../../../../shared/models/historyroom');

module.exports = {

  waterfallDone: function (err) {
    if (err)
      logger.error(err);
  },

  retrieveUser: function (user) {
    return function () {
      var args = _.toArray(arguments);
      var callback = args.pop();
      if (!_.isFunction(callback))
        return logger.error('retrieveUser parameters error, missing callback');

      if (_.isObject(user)) {
        args.unshift(null);
        args.push(user);
        return callback.apply(undefined, args);
      }

      UserModel.findByUid(user).exec(function (err, model) {
        args.unshift(err);
        args.push(model);
        callback.apply(undefined, args);
      });
    };
  },

  retrieveRoom: function (room) {
    return function () {
      var args = _.toArray(arguments);
      var callback = args.pop();
      if (!_.isFunction(callback))
        return logger.error('retrieveRoom parameters error, missing callback');

      if (_.isObject(room)) {
        args.unshift(null);
        args.push(room);
        return callback.apply(undefined, args);
      }

      RoomModel.findById(room, function (err, model) {
        args.unshift(err);
        args.push(model);
        callback.apply(undefined, args);
      });
    };
  },

  _retrieveHistory: function(type, history, previousArguments) {
    var args = _.toArray(previousArguments);
    var callback = args.pop();
    if (!_.isFunction(callback))
      return logger.error('_retrieveHistory parameters error, missing callback');

    if (_.isObject(history)) {
      args.unshift(null);
      args.push(history);
      return callback.apply(undefined, args);
    }

    var q;
    if (type == 'historyroom')
      q = HistoryRoomModel.findById(history)
        .populate('user')
        .populate('by_user')
        .populate('room');
    else if (type == 'historyone')
      q = HistoryOneModel.findById(history)
        .populate('to')
        .populate('from');
    else
      return callback.apply(undefined, ['Unable to determine history event type to retrieve: '+type]);

    q.exec(function (err, model) {
      args.unshift(err);
      args.push(model);
      return callback.apply(undefined, args);
    });
  },

  retrieveHistoryRoom: function(history) {
    var that = this;
    return function () {
      that._retrieveHistory('historyroom', history, arguments);
    };
  },

  retrieveHistoryOne: function(history) {
    var that = this;
    return function () {
      that._retrieveHistory('historyone', history, arguments);
    };
  },

  retrieveUnreadNotificationsCount: function (userId) {
    return function () {
      var args = _.toArray(arguments);
      var callback = args.pop();
      if (!_.isFunction(callback))
        return logger.error('Wrong parameters count, missing callback');

      NotificationModel.find({
        user: userId,
        done: false,
        viewed: false
      }).count().exec(function (err, count) {
        args.unshift(err);
        args.push(count);
        callback.apply(undefined, args);
      });
    };
  },

  checkPreferences: function (user, roomName, type) {
    return function () {
      var args = _.toArray(arguments);
      var callback = args.pop();
      if (!_.isFunction(callback))
        return logger.error('Wrong parameters count, missing callback');

      var err = null;
      if (user.preferencesValue('room:notif:nothing:__what__'.replace('__what__', roomName)) || !user.preferencesValue('room:notif:__type__:__what__'.replace('__type__', type).replace('__what__', roomName)))
        err = 'no notification due to user preferences';

      args.unshift(err);
      callback.apply(undefined, args);
    };
  }

};