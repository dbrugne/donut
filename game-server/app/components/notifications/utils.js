var logger = require('../../../pomelo-logger').getLogger('donut', __filename);
var _ = require('underscore');
var UserModel = require('../../../../shared/models/user');
var RoomModel = require('../../../../shared/models/room');
var HistoryOneModel = require('../../../../shared/models/historyone');
var HistoryRoomModel = require('../../../../shared/models/historyroom');
var conf = require('../../../../config/index');

module.exports = {

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

  _retrieveHistory: function (type, history, previousArguments) {
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
      return callback.apply(undefined, ['Unable to determine history event type to retrieve: ' + type]);

    q.exec(function (err, model) {
      args.unshift(err);
      args.push(model);
      return callback.apply(undefined, args);
    });
  },

  retrieveHistoryRoom: function (history) {
    var that = this;
    return function () {
      that._retrieveHistory('historyroom', history, arguments);
    };
  },

  retrieveHistoryOne: function (history) {
    var that = this;
    return function () {
      that._retrieveHistory('historyone', history, arguments);
    };
  },

  mentionize: function (message, html) {
    var reg = /@\[([^\]]+)\]\(user:[^)]+\)/g; // @todo dbr bundle mentionnize, linkify... other messages transfomrmation in a common class loadable in npm and bower
    if (html)
      return message.replace(reg, "<strong><a style=\"color:" + conf.room.default.color + ";\"href=\"" + conf.url + "/user/$1\">@$1</a></strong>")

    return message.replace(reg, "@$1");
  }


};