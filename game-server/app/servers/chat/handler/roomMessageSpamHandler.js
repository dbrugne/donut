var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var Room = require('../../../../../shared/models/room');
var HistoryRoom = require('../../../../../shared/models/historyroom');

module.exports = function (app) {
  return new Handler(app);
};

var Handler = function (app) {
  this.app = app;
};

var handler = Handler.prototype;

/**
 * Handle room message spam logic
 *
 * @param {Object} data name, messageId from client
 * @param {Object} session
 * @param  {Function} next stemp callback
 *
 */
handler.spam = function (data, session, next) {

  var that = this;

  async.waterfall([

    function check(callback) {
      if (!data.name)
        return callback('room:spam:message require room name param');

      if (!data.event)
        return callback('room:spam:message require event param');

      return callback(null);
    },

    function retrieveRoom(callback) {
      Room.findByName(data.name).exec(function (err, room) {
        if (err)
          return callback('Error while retrieving room in room:message:spam: ' + err);

        if (!room)
          return callback('Unable to retrieve room in room:message:spam: ' + data.name);

        if (!room.isOwnerOrOp(session.uid) && session.settings.admin !== true)
          return callback('This user ' + session.uid + ' isn\'t able spammed a message in this room: ' + data.name);

        return callback(null, room);
      });
    },

    function retrieveEvent(room, callback) {
      HistoryRoom.findOne({_id: data.event}, function (err, spammedEvent) {
        if (err)
          return callback('Error while retrieving event in room:message:spam: ' + err);

        if (!spammedEvent)
          return callback('Unable to retrieve event in room:message:spam: ' + data.event);

        if (spammedEvent.room != room.id)
          return callback('spammedEvent not correspond ' + data.event);

        if (spammedEvent.event !== 'room:message')
          return callback('spammedEvent should be room:message for: ' + data.event);

        return callback(null, room, spammedEvent);
      });
    },

    function persist(room, spammedEvent, callback) {
      spammedEvent.spammed = true;
      spammedEvent.spammed_at = new Date();
      spammedEvent.save(function (err) {
        if (err)
          return callback('Unable to persist spammed of ' + spammedEvent.id + ' on ' + room.name);

        return callback(null, room, spammedEvent);
      });
    },

    function prepareEvent(room, spammedEvent, callback) {
      var event = {
        name: room.name,
        event: spammedEvent.id
      };

      return callback(null, room, spammedEvent, event);
    },

    function broadcast(room, spammedEvent, event, callback) {
      that.app.globalChannelService.pushMessage('connector', 'room:message:spam', event, room.name, {}, function (err) {
        if (err)
          logger.error('Error while emitting room:message:spam in ' + room.name + ': ' + err); // not 'return', we delete even if error happen
        return callback(null, room, spammedEvent, event);
      });
    }

  ], function (err) {
    if (err) {
      logger.error(err);
      return next(null, {code: 500, err: err});
    }

    next(null, {});
  });

};