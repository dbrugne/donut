'use strict';
var errors = require('../../../util/errors');
var Room = require('../../../../../shared/models/room');

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

  Room.findByName(data.identifier).exec(function (err, room) {
    if (err) {
      return errorHandler(err);
    }
    if (!room) {
      return errorHandler('room-not-found');
    }

    return next(null, {identifier: room.name, room_id: room.id});
  });
};
