var logger = require('../../pomelo-logger').getLogger('donut', __filename);
var debug = require('debug')('donut:server:ws:room-emitter');
var _ = require('underscore');
var async = require('async');
var HistoryRoom = require('../../../shared/models/historyroom');
var cloudinary = require('../../../shared/util/cloudinary');

var recorder = HistoryRoom.record();

/**
 * Store history in MongoDB, emit event in corresponding room and call:
 *
 *   callback(err, sentEvent)
 *
 * @param app
 * @param eventName
 * @param eventData
 * @param callback
 */
module.exports = function(app, eventName, eventData, callback) {

  if (!eventData.name || !eventData.id)
    return callback("roomEmitter was called with an event without 'name' and/or 'id'");

  eventData.time = Date.now();
  recorder(eventName, eventData, function(err, history) {
    if (err)
      return fn('Error while emitting room event '+eventName+' in '+eventName.name+': '+err);

    eventData.id = history.id;

    // @hack
    // images
    if (eventData.images && eventData.images.length > 0) {
      eventData.images = _.map(eventData.images, function (element, key, value) {
        // @important: use .path to obtain URL with file extension and avoid CORS errors
        return cloudinary.messageImage(element.path);
      });
    }

    app.globalChannelService.pushMessage('connector', eventName, eventData, eventData.name, {}, function(err) {
      if (err)
        return callback('Error while pushing message: '+err);

      return callback(null, eventData);
    });
  });

};
