'use strict';
var _ = require('underscore');
var async = require('async');
var recorder = require('../../../shared/models/historyone').record();
var UserModel = require('../../../shared/models/user');
var cloudinary = require('../../../shared/util/cloudinary');

/**
 * Store history in MongoDB, emit event in corresponding onetoone and call:
 *
 *   callback(err, sentEvent)
 *
 * @param app
 * @param onetoone // {from: String, to: String}
 * @param eventName
 * @param eventData
 * @param callback
 */
module.exports = function (app, onetoone, eventName, eventData, callback) {
  eventData.from = onetoone.from;
  eventData.to = onetoone.to;
  eventData.time = Date.now();
  recorder(eventName, eventData, function (err, model) {
    if (err) {
      return callback('Error while saving event while emitting in onetoone ' + eventName + ': ' + err);
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
        app.globalChannelService.pushMessage('connector', eventName, eventData, 'user:' + onetoone.from.toString(), {}, function (err) {
          if (err) {
            return fn('Error while pushing message to sender: ' + err);
          }

          return fn(null);
        });
      },

      function sendToReceiver (fn) {
        // (if sender!=receiver) Broadcast message to all 'receiver' devices
        if (onetoone.from.toString() === onetoone.to.toString()) {
          return fn(null);
        }

        app.globalChannelService.pushMessage('connector', eventName, eventData, 'user:' + onetoone.to.toString(), {}, function (err) {
          if (err) {
            return fn('Error while pushing message to receiver: ' + err);
          }

          if ([ 'user:message' ].indexOf(eventName) === -1) {
            return fn(null);
          }

          UserModel.setUnviewedOneMessage(onetoone.from, onetoone.to, model.id, function (err) {
            return fn(err);
          });
        });
      }

    ], function (err) {
      return callback(err, eventData);
    });
  });
};
