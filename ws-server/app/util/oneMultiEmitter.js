'use strict';
var logger = require('../../../shared/util/logger').getLogger('donut', __filename.replace(__dirname + '/', ''));
var _ = require('underscore');
var async = require('async');

/**
 * Store history in MongoDB, emit event in corresponding one to one and call
 * callback
 *
 * @param app
 * @param onetoone // {from: String, to: String}
 * @param eventName
 * @param eventData
 * @param callback
 */
module.exports = function (app, onetoone, eventName, eventData, callback) {
  var onetoones = [];
  if (Array.isArray(onetoone)) {
    onetoones = onetoone;
  } else {
    onetoones.push(onetoone);
  }

  var parallels = [];
  _.each(onetoones, function (one) {
    parallels.push(function (fn) {
      var ed = _.clone(eventData); // avoid modification on the object reference
      ed.from = one.from;
      ed.to = one.to;
      ed.time = Date.now();

      ed.id = Date.now() + one.from + one.to;

      if (one.from.toString() === one.to.toString()) {
        return fn(null);
      }

      app.globalChannelService.pushMessage('connector', eventName, ed, 'user:' + one.to.toString(), {}, function (err) {
        if (err) {
          return logger.error('Error while pushing message: ' + err);
        }

        return fn(null);
      });
    });
  });

  // run tasks
  async.parallel(parallels, function (err, results) {
    return callback(err);
  });
};
