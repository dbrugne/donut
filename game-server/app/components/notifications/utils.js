var logger = require('../../../pomelo-logger').getLogger('donut', __filename);
var _ = require('underscore');
var NotificationModel = require('../../../../shared/models/notification');
var UserModel = require('../../../../shared/models/user');
var RoomModel = require('../../../../shared/models/room');
var HistoryOneModel = require('../../../../shared/models/historyone');
var HistoryRoomModel = require('../../../../shared/models/historyroom');

module.exports = {

  checkRepetitive: function (type, user, what, frequency) {

    return function () {
      var args = _.toArray(arguments);
      var callback = args.pop();
      if (!_.isFunction(callback))
        return logger.error('Wrong parameters count, missing callback');

      var delay = Date.now() - 1000 * 60 * frequency;

      var criteria = {
        type: type,
        time: {$gte: new Date(delay)}
      };

      if (user !== null) {
        criteria['user'] = user;
      }
      _.each(what, function (val, key) {
        criteria[key] = val;
      });

      NotificationModel.find(criteria).count(function (err, count) {
        if (!err && count > 0)
          err = 'no notification due to repetitive';

        args.unshift(err);
        callback.apply(undefined, args);
      });
    };

  },

  retrieveUser: function (userId) {
    return function () {
      var args = _.toArray(arguments);
      var callback = args.pop();
      if (!_.isFunction(callback))
        return logger.error('Wrong parameters count, missing callback');

      UserModel.findByUid(userId).exec(function (err, user) {
        args.unshift(err);
        args.push(user);
        callback.apply(undefined, args);
      });
    };
  },

  retrieveRoom: function (roomId) {
    return function () {
      var args = _.toArray(arguments);
      var callback = args.pop();
      if (!_.isFunction(callback))
        return logger.error('Wrong parameters count, missing callback');

      RoomModel.findById(roomId, function (err, room) {
        args.unshift(err);
        args.push(room);
        callback.apply(undefined, args);
      });
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
  },

  /**
   * Retrieve Event by id and populate required fields
   *
   * @param type      historyone || historyone
   * @param id        id of event to retrieve
   * @returns {Function}
   */
  retrieveEvent: function (type, id) {
    return function () {
      var args = _.toArray(arguments);
      var err = null;
      var callback = args.pop();

      if (!_.isFunction(callback))
        err = 'No notification due to user preferences';
      if (['historyroom', 'historyone'].indexOf(type) == -1)
        err = 'Wrong model type';

      if (err != null)
      {
        args.unshift(err);
        return callback.apply(undefined, args);
      }

      switch (type)
      {
        case 'historyone':
          HistoryOneModel
            .findById(id)
            .populate('to')
            .populate('from')
            .exec(function (err, event) {
              args.unshift(err);
              args.push(event);
              return callback.apply(undefined, args);
            });
          break;
        case 'historyroom':
          HistoryRoomModel
            .findById(id)
            .populate('user')
            .populate('room')
            .exec(function (err, event) {
              args.unshift(err);
              args.push(event);
              return callback.apply(undefined, args);
            });
          break;
      }
    };
  }
};