'use strict';
var _ = require('underscore');
var async = require('async');
var recorder = require('../../../shared/models/historyone').record();
var UserModel = require('../../../shared/models/user');
var cloudinary = require('../../../shared/util/cloudinary');

/**
 * Store history in database, then emit event
 *
 * @param app
 * @param eventName
 * @param eventData (with user_id and to_user_id keys)
 * @param callback
 */
module.exports = function (app, eventName, eventData, callback) {
  if (!eventData.user_id || !eventData.to_user_id) {
    return callback('oneEmitter require an event with user_id and to_user_id');
  }

  eventData.time = Date.now();
  recorder(eventName, eventData, function (err, model) {
    if (err) {
      return callback('oneEmitter error for ' + eventName, err);
    }

    eventData.id = model.id;

    // @hack
    // files
    if (eventData.files && eventData.files.length > 0) {
      eventData.files = _.map(eventData.files, function (element, key, value) {
        // @important: use .path to obtain URL with file extension and avoid
        // CORS errors
        return cloudinary.messageFile(element);
      });
    }

    async.parallel([

      function sendToSender (fn) {
        // Broadcast message to all 'sender' devices
        app.globalChannelService.pushMessage('connector', eventName, eventData, 'user:' + eventData.user_id, {}, function (err) {
          if (err) {
            return fn('Error while pushing message to sender: ' + err);
          }

          return fn(null);
        });
      },

      function sendToReceiver (fn) {
        // (if sender!=receiver) Broadcast message to all 'receiver' devices
        if (eventData.user_id === eventData.to_user_id) {
          return fn(null);
        }

        app.globalChannelService.pushMessage('connector', eventName, eventData, 'user:' + eventData.to_user_id, {}, function (err) {
          if (err) {
            return fn('Error while pushing message to receiver: ' + err);
          }

          if ([ 'user:message' ].indexOf(eventName) === -1) {
            return fn(null);
          }

          UserModel.setUnviewedOneMessage(eventData.user_id, eventData.to_user_id, model.id, function (err) {
            return fn(err);
          });
        });
      }

    ], function (err) {
      return callback(err, eventData);
    });
  });
};
