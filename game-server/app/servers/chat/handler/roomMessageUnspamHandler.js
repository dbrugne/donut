var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var Room = require('../../../../../shared/models/room');
var HistoryRoom = require('../../../../../shared/models/historyroom');
var Notifications = require('../../../components/notifications');
var roomEmitter = require('../../../util/roomEmitter');

module.exports = function(app) {
  return new Handler(app);
};

var Handler = function(app) {
  this.app = app;
};

var handler = Handler.prototype;

/**
 * Handle room op logic
 *
 * @param {Object} data message from client
 * @param {Object} session
 * @param  {Function} next stemp callback
 *
 */
handler.unspam = function(data, session, next) {

  var that = this;

  async.waterfall([

    function check(callback) {
      if (!data.name)
        return callback('room:unspam:message require room name param');

      if (!data.event)
        return callback('room:unspam:message require event param');

      return callback(null);
    },

    function retrieveRoom(callback) {
      Room.findByName(data.name).exec(function (err, room) {
        if (err)
          return callback('Error while retrieving room in room:message:unspam: '+err);

        if (!room)
          return callback('Unable to retrieve room in room:message:unspam: '+data.name);

        if (!room.isOwnerOrOp(session.uid) && session.settings.admin !== true)
          return callback('This user '+session.uid+' isn\'t able to op another user in this room: '+data.name);

        return callback(null, room);
      });
    },

    function retrieveEvent(room, callback) {
      HistoryRoom.findOne({ _id: data.event }, function(err, unspammedEvent) {
        if (err)
          return callback('Error while retrieving room in room:message:unspam: '+err);

        if (!unspammedEvent)
          return callback('Unable to retrieve room in room:message:unspam: '+data.event);

        if (unspammedEvent.room != room.id)
          return callback('spammedEvent not correspond '+data.event);

        if (unspammedEvent.event !== 'room:message')
          return callback('unspammedEvent should be room:message for: '+data.event);

        return callback(null, room, unspammedEvent);
      });
    },

    function persist(room, unspammedEvent, callback) {
      unspammedEvent.spammed = false;
      unspammedEvent.spammed_at = new Date();
      unspammedEvent.save(function(err) {
        if (err)
          return callback('Unable to persist spammed of '+unspammedEvent.id+' on '+room.name);

        return callback(null, room, unspammedEvent);
      });
    },

    function prepareEvent(room, unspammedEvent, callback) {
      var event = {
        name: room.name,
        event: unspammedEvent.id
      };

      return callback(null, room, unspammedEvent, event);
    },

    function broadcast(room, unspammedEvent, event, callback) {
      that.app.globalChannelService.pushMessage('connector', 'room:message:unspam', event, room.name, {}, function(err) {
        if (err)
          logger.error(''); // not 'return', we delete even if error happen
        // @todo : mettre le commentaire.
        return callback(null, room, unspammedEvent, event);
      });
    }

  ], function(err) {
    if (err) {
      logger.error(err);
      return next(null, {code: 500, err: err});
    }

    next(null, {});
  });

};