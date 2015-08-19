var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var async = require('async');
var _ = require('underscore');
var User = require('../../../../../shared/models/user');
var emailer = require('../../../../../shared/io/emailer');
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

  async.waterfall([

    function check(callback) {
      if (!data.user_id)
        return callback('id is mandatory');

      if (!validator.isEmail(data.user_new_mail))
        return callback('wrong-format');

      if (data.user_new_mail === user.local.email)
        return callback('same-mail');

      return callback(null);
    },

    function mail(callback) {
      var email = data.user_new_mail;
      user.local.email = email.toLowerCase();
      user.save(function() {
        emailer.emailChanged(user.local.email, function(err) {
          if (err)
            return console.log('Unable to sent email changed email: '+err);
        });
      });
      return callback(null);
    }

  ], function(err) {
    if (err) {
      logger.error('[user:email:edit] ' + err);
      return next(null, { code: 500, err: err });
    }

    return next(null, {});
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

  ], function(err) {
    if (err) {
      logger.error('[user:password:edit] ' + err);
      return next(null, { code: 500, err: err });
    }

    return next(null, read);
  });
};