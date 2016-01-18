'use strict';
var errors = require('../../../util/errors');
var async = require('async');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function (data, session, next) {
  var user = session.__currentUser__;
  var group = session.__group__;

  async.waterfall([

    function check (callback) {
      if (!data.group_id) {
        return callback('params-group-id');
      }

      if (!group) {
        return callback('group-not-found');
      }

      return callback(null);
    },

    function persistOnUser (callback) {
      user.groups.addToSet(group.id);
      user.save(function (err) {
        return callback(err);
      });
    }

  ], function (err) {
    if (err) {
      return errors.getHandler('group:join', next)(err);
    }

    return next(null, {success: true});
  });
};
