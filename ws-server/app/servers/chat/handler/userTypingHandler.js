'use strict';
var logger = require('../../../../../shared/util/logger').getLogger('donut', __filename.replace(__dirname + '/', ''));
var async = require('async');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function (data, session, next) {
  var user = session.__currentUser__;
  var withUser = session.__user__;

  var that = this;

  async.waterfall([

    function check (callback) {
      if (!data.user_id) {
        return callback('params');
      }

      if (!withUser) {
        return callback('unknown');
      }

      return callback(null);
    },

    function broadcast (callback) {
      var typingEvent = {
        from_user_id: user.id,
        to_user_id: withUser.id,
        user_id: user.id,
        username: user.username
      };
      that.app.globalChannelService.pushMessage('connector', 'user:typing', typingEvent, 'user:' + withUser.id, {}, callback);
    }

  ], function (err) {
    if (err) {
      if (err === 'params') {
        logger.warn('[user:typing] ' + err);
        return next(null, { code: 400, err: err });
      }
      if (err === 'unknown') {
        logger.warn('[user:typing] ' + err);
        return next(null, { code: 404, err: err });
      }
      logger.error('[user:typing] ' + err);
      return next(null, { code: 500, err: 'internal' });
    }

    return next(null, { success: true });
  });
};
