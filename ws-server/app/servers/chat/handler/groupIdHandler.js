'use strict';
var errors = require('../../../util/errors');
var GroupModel = require('../../../../../shared/models/group');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function (data, session, next) {
  var errorHandler = errors.getHandler('group:id', next);

  if (!data.identifier) {
    return errorHandler('params-group-name');
  }

  GroupModel.findByName(data.identifier).exec(function (err, model) {
    if (err) {
      return errorHandler(err);
    }
    if (!model) {
      return errorHandler('group-not-found');
    }

    return next(null, {identifier: model.name, group_id: model.id});
  });
};
