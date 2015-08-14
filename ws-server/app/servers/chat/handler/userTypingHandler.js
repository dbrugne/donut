var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var User = require('../../../../../shared/models/user');

var Handler = function(app) {
  this.app = app;
};

module.exports = function(app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.typing = function(data, session, next) {

  var user = session.__currentUser__;
  var withUser = session.__user__;

  var that = this;

  async.waterfall([

    function check(callback) {
      if (!data.username)
        return callback('username is mandatory');

      if (!withUser)
        return callback('unable to retrieve withUser: ' + data.username);

      if (withUser.isBanned(user.id))
        return callback('user is banned by withUser');

      return callback(null);
    },

    function sendToUserSockets(callback) {
      var typingEvent = {
        from_user_id  : user.id,
        from_username : user.username,
        from_avatar   : user._avatar(),
        to_user_id    : withUser.id,
        to_username   : withUser.username,
        time          : Date.now(),
        username          : user.username
      };
      that.app.globalChannelService.pushMessage('connector', 'user:typing', typingEvent, 'user:' + withUser.id, {}, callback);
    }

  ], function(err) {
    if (err)
      logger.error('[user:typing] ' + err);

    next(err);
  });

};