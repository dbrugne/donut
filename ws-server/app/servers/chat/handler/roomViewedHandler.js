'use strict';
var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var User = require('../../../../../shared/models/user');
var Room = require('../../../../../shared/models/room');
var HistoryRoom = require('../../../../../shared/models/historyroom');
var pattern = new RegExp('^[0-9a-fA-F]{24}$');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function (data, session, next) {
  var user = session.__currentUser__;
  var room = session.__room__;

  var that = this;

  async.waterfall([

    function check (callback) {
      if (!data.room_id)
        return callback('id is mandatory');

      if (!data.events || !_.isArray(data.events))
        return callback('events parameter is mandatory');

      if (!room)
        return callback('unable to retrieve room: ' + data.room_id);

      data.events = _.filter(data.events, function (id) {
        // http://stackoverflow.com/questions/11985228/mongodb-node-check-if-objectid-is-valid
        return pattern.test(id);
      });
      if (!data.events.length)
        return callback('events parameter should contains at least one valid event _id');

      return callback(null);
    },

    function persist (callback) {
      HistoryRoom.update({
        _id: { $in: data.events },
        event: { $in: ['room:message', 'room:topic'] }
      }, {
        $addToSet: { viewed: user._id }
      }, {
        multi: true
      }, function (err) {
        return callback(err);
      });
    },

    function persistOnUser (callback) {
      user.resetUnviewedRoom(room._id, callback);
    },

    function sendToUserSockets (callback) {
      var viewedEvent = {
        name: room.name,
        room_id: room.id,
        events: data.events
      };
      that.app.globalChannelService.pushMessage('connector', 'room:viewed', viewedEvent, 'user:' + user.id, {}, callback);
    }

  ], function (err) {
    if (err)
      logger.error('[room:viewed] ' + err);

    next(err);
  });

};
