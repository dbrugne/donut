'use strict';
var errors = require('../../../util/errors');
var UserModel = require('../../../../../shared/models/user');

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

  UserModel.findByUsername(data.username).exec(function (err, model) {
    if (err) {
      return errorHandler(err);
    }
    if (!model) {
      return errorHandler('user-not-found');
    }

    return next(null, {username: model.username, user_id: model.id});
  });
};
