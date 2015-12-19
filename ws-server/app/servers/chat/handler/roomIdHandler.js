'use strict';
var errors = require('../../../util/errors');
var RoomModel = require('../../../../../shared/models/room');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function (data, session, next) {
  var errorHandler = errors.getHandler('room:id', next);

  if (!data.identifier) {
    return errorHandler('params-room-identifier');
  }

  RoomModel.findByIdentifier(data.identifier, function (err, model) {
    if (err) {
      return errorHandler(err);
    }
    if (!model) {
      return errorHandler('room-not-found');
    }

    return next(null, {identifier: model.name, room_id: model.id, group: model.group});
  });
};
