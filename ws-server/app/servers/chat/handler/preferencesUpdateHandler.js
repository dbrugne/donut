'use strict';
var logger = require('../../../../../shared/util/logger').getLogger('donut', __filename);
var async = require('async');
var User = require('../../../../../shared/models/user');
var validator = require('validator');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function (data, session, next) {
  var user = session.__currentUser__;

  var that = this;

  async.waterfall([

    function validate (callback) {
      // @doc: https://www.npmjs.org/package/validator

      if (!data.data || data.data.length < 1) {
        return callback('No data to update');
      }

      if (data.data.length > 1) {
        return callback('Too many data to update (max. 1)');
      }

      // key
      var keys = Object.keys(data.data);
      var key = keys[0];
      if (!key || (!(/^[a-z0-9]+[a-z0-9:]+[a-z0-9]+$/i).test(key) && !(/^[a-z0-9]+[a-z0-9:]+:#[-a-z0-9\._|[\]^]{3,24}$/i).test(key))) { // plain and contextual keys
        return callback('invalidkey');
      }

      if (!User.preferencesIsKeyAllowed(key)) { // only if whitelisted
        return callback('notallowedkey');
      }

      // value
      var value = validator.toBoolean(data.data[key]);
      if (user.preferences && user.preferences[key] === value) {
        return callback('samevalue');
      }

      return callback(null, key, value);
    },

    function update (key, value, callback) {
      user.set('preferences.' + key, value); // we can also remove the key when value === false ('$unset: {key: 1}') to save database space
      user.save(function (err) {
        return callback(err, key, value);
      });
    },

    function broadcastUser (key, value, callback) {
      // notify only certain fields
      var fieldToNotify = ['browser:exitpopin', 'browser:welcome', 'browser:sounds', 'notif:channels:desktop'];
      if (fieldToNotify.indexOf(key) === -1) {
        return callback(null);
      }

      var event = {};
      event[key] = value;

      that.app.globalChannelService.pushMessage('connector', 'preferences:update', event, 'user:' + user.id, {}, callback);
    }

  ], function (err) {
    if (err) {
      logger.error('[preferences:update] ' + err);
      return next(null, {code: 500, err: 'internal'});
    }

    next(null, {});
  });
};
