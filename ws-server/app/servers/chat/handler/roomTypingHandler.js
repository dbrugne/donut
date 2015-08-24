var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');

var Handler = function(app) {
  this.app = app;
};

module.exports = function(app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function(data, session, next) {

  var user = session.__currentUser__;
  var room = session.__room__;

  var that = this;

  async.waterfall([

    function check(callback) {
      if (!data.name)
        return callback('name is mandatory');

      if (room.users.indexOf(user.id) === -1)
        return callback('this user ' + user.id + ' is not currently in room ' + room.name);

      if (room.isDevoice(user.id))
        return callback('user is devoiced, he can\'t type/send message in room');

      return callback(null);
    },

    function broadcast(callback) {
      var typingEvent = {
        name: room.name,
        id: data.room_id,
        user_id: user.id,
        username: user.username
      };
      that.app.globalChannelService.pushMessage('connector', 'room:typing', typingEvent, room.name, {}, callback);
    }

  ], function(err) {
    if (err)
      logger.error('[room:typing] ' + err);

    next(err);
  });

};