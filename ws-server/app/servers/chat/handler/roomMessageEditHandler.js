var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var inputUtil = require('../../../util/input');
var conf = require('../../../../../config');
var common = require('donut-common');

var Handler = function(app) {
  this.app = app;
};

module.exports = function(app) {
  return new Handler(app);
};

var handler = Handler.prototype;

/**
 * Handle room message edit logic
 *
 * @param {Object} data name, messageId, message from client
 * @param {Object} session
 * @param {Function} next stemp callback
 */
handler.edit = function(data, session, next) {

  var user = session.__currentUser__;
  var room = session.__room__;
  var event = session.__event__;

  var that = this;

  async.waterfall([

    function check(callback) {
      if (!data.name)
        return callback('require name param');

      if (!data.event)
        return callback('require event param');

      if (!data.message)
        return callback('require message param');

      if (!room)
        return callback('unable to retrieve room: ' + data.name);

      if (!event)
        return callback('unable to retrieve event: ' + data.event);

      if (event.event !== 'room:message')
        return callback('event should be room:message: ' + data.event);

      if (event.room != room.id)
        return callback('event ' + data.event + ' not correspond to given room ' + room.name);

      if (user.id !== event.user.toString())
        return callback(user.id + ' tries to modify message ' + data.event + ' from ' + event.user.toString());

      if ((Date.now() - event.time) > conf.chat.message.maxedittime * 60 * 1000)
        return callback(user.id + ' tries to edit an old message: ' + event.id);

      var message = inputUtil.filter(data.message, 512);

      if (!message)
        return callback('empty message (no text)');

      if (message === event.data.message)
        return callback('posted message is the same as original');

      inputUtil.mentions(message, function(err, message, mentions) {
        return callback(err, message);
      });
    },

    function persist(message, callback) {
      event.update({
        $set: { edited : true,  edited_at: new Date(), 'data.message': message }
      }, function(err) {
        return callback(err, message);
      });
    },

    function prepareEvent(message, callback) {
      var eventToSend = {
        name: room.name,
        event: event.id,
        message: message,
        images: (event.data.images)
          ? event.data.images
          : null
      };
      that.app.globalChannelService.pushMessage('connector', 'room:message:edit', eventToSend, room.name, {}, callback);
    }

  ], function (err) {
    if (err)
      logger.error('[room:message:edit] ' + err);

    next(null); // even for .notify
  });

};

