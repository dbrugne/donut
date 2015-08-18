var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var User = require('../../../../../shared/models/user');
var validator = require('validator');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.email = function (data, session, next) {

  var user = session.__currentUser__;

  var that = this;

  var error = '';

  async.waterfall([

    function check(callback) {
      if (!data.user_id)
        return callback('id is mandatory');

      if (!validator.isEmail(data.user_new_mail))
        error += data.user_mail + ' isn\'t a mail ';
    },

    function sendToUserSockets(callback) {
      var emailEvent = {
        from_user_id  : user.id,
        from_username : user.username,
        from_avatar   : user._avatar(),
        to_user_id    : user.id,
        to_username   : user.username,
        time          : Date.now()
      };
      that.app.globalChannelService.pushMessage('connector', 'user:email:edit', emailEvent, 'user:' + user.id, {}, callback);
    }

  ], function (err) {
    if (err) {
      logger.error('[user:email] ' + err);
    }

    next(err);
  });
};

handler.password = function (data, session, next) {

  var user = session.__currentUser__;

  var that = this;

  async.waterfall([
    function check(callback) {
      return callback(null);
    },

    function sendToUserSockets(callback) {
      var emailEvent = {
        user_id: user.id
      };
      that.app.globalChannelService.pushMessage('connector', 'user:password:edit', emailEvent, 'user:' + user.id, {}, callback);
    }

  ], function (err) {
    if (err) {
      logger.error('[user:password] ' + err);
    }

    next(err);
  });
};