'use strict';

var async = require('async');
var common = require('@dbrugne/donut-common/server');
var UserModel = require('../../../shared/models/user');
var RoomModel = require('../../../shared/models/room');
var GroupModel = require('../../../shared/models/group');

// group
var groupParameter = function (req) {
  return function (callback) {
    if (!req.body || !req.body.group_id) {
      return callback(null);
    }
    if (!common.validate.objectId(req.body.group_id)) {
      return callback('params-group-id');
    }

    var q = GroupModel.findOne({_id: req.body.group_id})
      .populate('owner', 'username realname avatar facebook');

    // @todo : for now, no route require extended
    var more = [];
    if (more.indexOf(req.path)) {
      q.populate('op', 'username realname avatar facebook')
        .populate('bans.user', 'username realname avatar facebook')
        .populate('members', 'username realname avatar facebook');
    }

    q.exec(function (err, doc) {
      if (err) {
        return callback(err);
      }
      if (!doc) {
        return callback('group-not-found');
      }

      req.__group = doc;
      return callback(null);
    });
  };
};

// room
var roomParameter = function (req) {
  return function (callback) {
    if (!req.body || !req.body.room_id) {
      return callback(null);
    }
    if (!common.validate.objectId(req.body.room_id)) {
      return callback('params-room-id');
    }

    var q = RoomModel.findOne({_id: req.body.room_id})
      .populate('owner', 'username realname avatar facebook')
      .populate('group', 'name members bans owner default');

    // @todo : for now, no route require extended
    var more = [];
    if (more.indexOf(req.path)) {
      // @todo populate other
    }

    q.exec(function (err, doc) {
      if (err) {
        return callback(err);
      }
      if (!doc) {
        return callback('room-not-found');
      }

      req.__room = doc;
      return callback(null);
    });
  };
};

// user
var userParameter = function (req) {
  return function (callback) {
    if (!req.body || !req.body.user_id) {
      return callback(null);
    }
    if (!common.validate.objectId(req.body.user_id)) {
      return callback('params-user-id');
    }

    var q = UserModel.findOne({_id: req.body.user_id})
      .populate('owner', 'username realname avatar facebook')
      .populate('group', 'name members bans owner default');

    // @todo : for now, no route require extended
    var more = [];
    if (more.indexOf(req.path)) {
      // @todo populate other
    }

    q.exec(function (err, doc) {
      if (err) {
        return callback(err);
      }
      if (!doc) {
        return callback('user-not-found');
      }

      req.__user = doc;
      return callback(null);
    });
  };
};

module.exports = function parametersMiddleware (req, res, next) {
  async.series([
    groupParameter(req),
    roomParameter(req),
    userParameter(req)
  ], next);
};
