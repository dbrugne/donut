var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var User = require('../../../../../shared/models/user');
var inputUtil = require('../../../util/input');
var Room = require('../../../../../shared/models/room');
var HistoryRoom = require('../../../../../shared/models/historyroom');
var conf = require('../../../../../config');
var common = require('donut-common');

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

      if (!common.validateName(data.name))
        return callback('Invalid name in room:message:edit: '+data.name);

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

    function retrieveEvent(room, callback) {
      HistoryRoom.findOne({_id: data.event}, function (err, editedEvent) {
        if (err)
          return callback('Error while retrieving event in room:mesage:edit: ' + err);

        if (!editedEvent)
          return callback('Unable to retrieve event in room:message:edit: ' + data.event);

        if (editedEvent.event !== 'room:message')
          return callback('editedEvent should be room:message for: ' + data.event);

        if (editedEvent.room != room.id)
          return callback('editedEvent ' + data.event + ' not correspond to given room ' + room.name);

        if (session.uid !== editedEvent.user.toString())
          return callback('User ' + session.uid + ' tries to modify a message from another user: '
            + data.event + ' (' + editedEvent.user.toString() + ')');

        if ((Date.now() - editedEvent.time) > conf.chat.message.maxedittime * 60 * 1000)
          return callback('User ' + session.uid + ' tries to edit an old message: ' + editedEvent.id);

        return callback(null, room, editedEvent);
      });
    },

    function checkMessage(room, editedEvent, callback) {
      // text filtering
      var message = inputUtil.filter(data.message, 512);

      if (!message)
        return callback('Empty message (no text)');

      if (message === editedEvent.data.message)
        return callback('Posted message has not been changed');

      return callback(null, room, editedEvent, message);
    },

    function mentions(room, editedEvent, message, callback) {
      inputUtil.mentions(message, function(err, message, mentions) {
        return callback(err, room, editedEvent, message, mentions);
      });
    },

    function persist(room, editedEvent, message, mentions, callback) {
      editedEvent.update({ $set: { edited : true,  edited_at: new Date(), 'data.message': message } }, function(err) {
        if (err)
          return callback('Unable to persist message edition of ' + editedEvent.id + ': ' + err);

        return callback(null, room, editedEvent, message);
      });
    },

    function prepareEvent(room, editedEvent, message, callback) {
      var event = {
        name: room.name,
        event: editedEvent.id,
        message: message,
        images: editedEvent.data.images ? editedEvent.data.images : null
      };
      that.app.globalChannelService.pushMessage('connector', 'room:message:edit', event, room.name, {}, function (err) {
        if (err)
          return callback('Error while emitting room:message:edit in ' + room.name + ': ' + err);

        return callback(null);
      });
    }

  ], function (err) {
    if (err)
      logger.error(err);

    next(null); // even for .notify
  });

};

