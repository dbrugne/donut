var logger = require('../../pomelo-logger').getLogger('donut', __filename);
var debug = require('debug')('donut:server:ws:room-emitter');
var _ = require('underscore');
var async = require('async');
var recorder = require('../../../shared/models/historyroom').record();
var UserModel = require('../../../shared/models/user');
var cloudinary = require('../../../shared/util/cloudinary');

/**
 * Store history in MongoDB, emit event in corresponding room and call:
 *
 *   callback(err, sentEvent)
 *
 * @param app
 * @param Room
 * @param User that made the action
 * @param eventName
 * @param eventData
 * @param callback
 */
module.exports = function(app, user, room, eventName, eventData, callback) {
  if (!room)
    return callback('roomEmitter require room parameter');
  if (!user)
    return callback('roomEmitter require user parameter');

  eventData.time = Date.now();
  eventData.name = room.name;
  eventData.room_name = room.name;
  eventData.room_id = room.id;

  recorder(room, eventName, eventData, function(err, model) {
    if (err)
      return fn('Error while emitting room event ' + eventName + ' in ' + room.name + ': '+err);

    eventData.id = model.id;

    // @hack
    // images
    if (eventData.images && eventData.images.length > 0) {
      eventData.images = _.map(eventData.images, function (element, key, value) {
        // @important: use .path to obtain URL with file extension and avoid CORS errors
        return cloudinary.messageImage(element.path);
      });
    }

    app.globalChannelService.pushMessage('connector', eventName, eventData, room.name, {}, function(err) {
      if (err)
        return callback('Error while pushing message: '+err);

      if (['room:message', 'room:topic', 'room:me'].indexOf(eventName) === -1)
        return callback(null, eventData);

      // set unviewed flag on users
      UserModel.setUnviewedRoomMessage(room._id, room.users, user._id, model._id, function (err) {
        callback(err, eventData);
      });
    });
  });

};
