var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var roomEmitter = require('../../../util/roomEmitter');
var inputUtil = require('../../../util/input');
var imagesUtil = require('../../../util/images');
var keenio = require('../../../../../shared/io/keenio');
var Notifications = require('../../../components/notifications');
var common = require('donut-common');

module.exports = function (app) {
  return new Handler(app);
};

var Handler = function (app) {
  this.app = app;
};

var handler = Handler.prototype;

/**
 * Handle room message logic
 *
 * @param {Object} data message from client
 * @param {Object} session
 * @param  {Function} next stemp callback
 */
handler.message = function (data, session, next) {

  var user = session.__currentUser__;
  var room = session.__room__;

  var that = this;

  async.waterfall([

    function check(callback) {
      if (!data.name)
        return callback('name is mandatory');

      if (!user)
        return callback('unable to retrieve user: ' + session.uid);

      if (!room)
        return callback('unable to retrieve room from ' + data.name);

      if (room.users.indexOf(user.id) === -1)
        return callback('this user ' + user.id + ' is not currently in room ' + room.name);

      if (room.isDevoice(user.id))
        return callback('user is devoiced, he can\'t send message in room');

      return callback(null);
    },

    function prepareMessage(callback) {
      // text filtering
      var message = inputUtil.filter(data.message, 512);

      // images filtering
      var images = imagesUtil.filter(data.images);

      if (!message && !images)
        return callback('Empty message (no text, no image)');

      return callback(null, message, images);
    },

    function mentions(message, images, callback) {
      inputUtil.mentions(message, function(err, message, mentions) {
        return callback(err, message, images, mentions);
      });
    },

    function prepareEvent(message, images, mentions, callback) {
      var event = {
        name: room.name,
        id: room.id,
        time: Date.now(),
        user_id: user.id,
        username: user.username,
        avatar: user._avatar()
      };
      if (message)
        event.message = message;
      if (images && images.length)
        event.images = images;

      return callback(null, event, mentions);
    },

    function historizeAndEmit(event, mentions, callback) {
      roomEmitter(that.app, 'room:message', event, function (err, sentEvent) {
        if (err)
          return callback(err);

        return callback(null, sentEvent, mentions);
      });
    },

    function mentionNotification(sentEvent, mentions, callback) {
      var mentions = common.findMarkupedMentions(sentEvent.message);
      if (!mentions.length)
        return callback(null, sentEvent);

      var usersIds = [];
      _.each(mentions, function(m) {
        if (m.type !== 'user')
          return;
        usersIds.push(m.id);
      });

      if (!usersIds.length)
        return callback(null, sentEvent);

      // limit
      usersIds = _.first(usersIds, 10);

      async.each(usersIds, function (userId, fn) {
        Notifications(that.app).getType('usermention').create(userId, room, sentEvent.id, fn);
      }, function (err) {
        if (err)
          logger.error(err);
        callback(null, sentEvent);
      });
    },

    function messageNotification(sentEvent, callback) {
      // @todo : change pattern for this event (particularly frequent) and tag historyRoomModel as "to_be_consumed" and
      //         implement a consumer to treat notifications asynchronously
      Notifications(that.app).getType('roommessage').create(room, sentEvent.id, function (err) {
        if (err)
          logger.error(err);
        return callback(null, sentEvent);
      });
    },

    function tracking(event, callback) {
      var messageEvent = {
        session: {
          id: session.settings.uuid,
          connector: session.frontendId
        },
        user: {
          id: session.uid,
          username: session.settings.username,
          admin: (session.settings.admin === true)
        },
        room: {
          name: room.name
        },
        message: {
          length: (event.message && event.message.length) ? event.message.length : 0,
          images: (event.images && event.images.length) ? event.images.length : 0
        }
      };
      keenio.addEvent("room_message", messageEvent, function (err, res) {
        if (err)
          logger.error('Error while tracking room_message in keen.io: ' + err);

        return callback(null);
      });
    }

  ], function (err) {
    if (err)
      return next(null, {code: 500, err: err});

    return next(null, {success: true});
  });

};