var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var User = require('../../../../../shared/models/user');
var inputUtil = require('../../../util/input');
var Room = require('../../../../../shared/models/room');
var HistoryRoom = require('../../../../../shared/models/historyroom');

module.exports = function(app) {
  return new Handler(app);
};

var Handler = function(app) {
  this.app = app;
};

var handler = Handler.prototype;

/**
 * Handle room message edit logic
 *
 * @param {Object} data name, messageId, message from client
 * @param {Object} session
 * @param {Function} next stemp callback
 *
 */
handler.edit = function(data, session, next) {

  var that = this;

  async.waterfall([

    function check(callback) {
      if (!data.name)
        return callback('room:message:edit require name param');

      if (!data.event)
        return callback('room:message:edit require event param');

      if (!data.message)
        return callback('room:message:edit require message param');

      return callback(null);
    },


    function retrieveRoom(callback) {
      Room.findByName(data.name).exec(function (err, room) {
        if (err)
          return callback('Error while retrieving room in room:message:edit: ' + err);

        if (!room)
          return callback('Unable to retrieve room in room:message:edit ' + data.name);

        return callback(null, room);
      });
    },

    function retrieveOneEvent(room, callback) {
      HistoryRoom.findOne({_id: data.event}, function (err, editEvent) {
        if (err)
          return callback('Error while retrieving event in room:mesage:edit: ' + err);

        if (!editEvent)
          return callback('Unable to retrieve event in room:message:edit: ' + data.event);

        if (editEvent.room != room.id)
          return callback('editEvent not correspond ' + data.event);

        if (session.uid !== editEvent.user.toString())
          return callback(session.uid + ' should be :' + editEvent.user.toString());

        if (editEvent.event !== 'room:message')
          return callback('editEvent should be room:message for: ' + data.event);

        return callback(null, room, editEvent);
      });
    },

    function checkMessage(room, editEvent, callback) {
      // text filtering
      var message = inputUtil.filter(data.message, 512);

      if (!message)
        return callback('Empty message no text');

      if (message === editEvent.data.message)
        return callback('The message has not changed');

      var time = 3600 * 1000; // 1 hours.
      var diff = Date.now() - editEvent.time;

      if (diff > time)
        return callback('Message too old : ' + (diff / 1000) + ' > ' + (time / 1000));

      return callback(null, room, editEvent, message);
    },

    function persist(room, editEvent, message, callback) {
      editEvent.update({ edited : true, data: { message: message },  edited_at: new Date() }, function(err) {
        if (err)
          return callback('Unable to persist edited of ' + editEvent.id);
        return callback(null, room, editEvent, message);
      });
    },

    function prepareEvent(room, editEvent, message, callback) {
      var event = {
        name: room.name,
        event: editEvent.id,
        message: message
      };

      return callback(null, room, event);
    },

    function broadcast(room, event, callback) {
      that.app.globalChannelService.pushMessage('connector', 'room:message:edit', event, room.name, {}, function (err) {
        if (err)
          logger.error('Error while emitting room:message:edit in ' + room.name + ': ' + err); // not 'return', we delete even if error happen
        return callback(null, room, event);
      });
    }

  ], function (err) {
    if (err)
      logger.error(err);

    next(null); // even for .notify
  });

};

