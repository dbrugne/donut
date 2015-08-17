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

  var that = this;

  async.waterfall([

    function check(callback) {
      if (!data.user_id)
        return callback('id parameter is mandatory for user:typing');

      return callback(null);
    },

    function sendToUserSockets(callback) {
      var typingEvent = {
        from_user_id  : user.id,
        to_user_id    : data.user_id,
        user_id       : user.id,
        time          : Date.now(),
        username      : user.username
      };
      that.app.globalChannelService.pushMessage('connector', 'user:typing', typingEvent, 'user:' + data.user_id, {}, callback);
    }

  ], function(err) {
    if (err)
      logger.error('[user:typing] ' + err);

    next(err);
  });

};