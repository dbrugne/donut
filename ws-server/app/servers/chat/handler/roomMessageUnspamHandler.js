'use strict';
var logger = require('../../../../../shared/util/logger').getLogger('donut', __filename);
var async = require('async');

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
  var event = session.__event__;

  var that = this;

  async.waterfall([

    function check (callback) {
      if (!data.room_id)
        return callback('id is mandatory');

      if (!data.event)
        return callback('require event param');

      if (!room)
        return callback('unable to retrieve room: ' + data.room_id);

      if (!room.isOwnerOrOp(user.id) && session.settings.admin !== true)
        return callback('this user ' + user.id + " isn't able to unspammed a message in " + room.name);

      if (!event)
        return callback('unable to retrieve event: ' + data.event);

      if (event.room != room.id)
        return callback('event and room parameters not correspond ' + data.event);

      if (event.event !== 'room:message')
        return callback('event ' + data.event + ' should be a room:message');

      return callback(null);
    },

    function persist (callback) {
      event.update({ $unset: { spammed: true, spammed_at: true }}, function (err) {
        return callback(err);
      });
    },

    function broadcast (callback) {
      var eventToSend = {
        room_id: room.id,
        event: event.id
      };
      that.app.globalChannelService.pushMessage('connector', 'room:message:unspam', eventToSend, room.name, {}, callback);
    }

  ], function (err) {
    if (err) {
      logger.error('[room:message:unspam] ' + err);
      return next(null, {code: 500, err: 'internal'});
    }

    next(null, {});
  });

};
