var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var roomEmitter = require('../../../util/roomEmitter');
var inputUtil = require('../../../util/input');
var keenio = require('../../../../../shared/io/keenio');
var Notifications = require('../../../components/notifications');
var common = require('donut-common');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.me = function (data, session, next) {

  var user = session.__currentUser__;
  var room = session.__room__;

  async.waterfall([
    function check(callback) {
      if (!data.name)
        return callback('name is mandatory');

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

      if (!message)
        return callback('Empty message (no text)');

      return callback(message);
    },

    function prepareEvent(message, callback) {
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

      return callback(null, event);
    },

    function historizeAndEmit(event, callback) {
      roomEmitter(that.app, 'room:me', event, function (err, sentEvent) {
        if (err)
          return callback(err);

        return callback(null);
      });
    },
  ],  function (err) {
    if (err) {
      logger.error('[room:me] ' + err);
      return next(null, {code: 500, err: err});
    }

    return next(null, {success: true});
  });
};
