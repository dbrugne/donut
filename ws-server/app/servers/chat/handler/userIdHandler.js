'use strict';
var errors = require('../../../util/errors');
var User = require('../../../../../shared/models/user');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function (data, session, next) {
  var errorHandler = errors.getHandler('user:id', next);

  if (!data.username) {
    return errorHandler('params-username');
  }

  User.findByUsername(data.username).exec(function (err, user) {
    if (err) {
      return errorHandler(err);
    }
    if (!user) {
      return errorHandler('user-not-found');
    }

    return next(null, {username: user.username, user_id: user.id});
  });
};
