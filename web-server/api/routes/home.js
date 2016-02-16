'use strict';

var logger = require('pomelo-logger').getLogger('web', __filename);
var express = require('express');
var router = express.Router();
var _ = require('underscore');
var async = require('async');

var RoomModel = require('../../../shared/models/room');
var GroupModel = require('../../../shared/models/group');

var authorization = require('../middlewares/authorization');

router.route('/api/home').post([authorization], function (req, res) {
  var limit = parseInt(req.body.limit, 10);
  if (!_.isNumber(limit) || _.isNaN(limit) || limit > 14) {
    limit = 14;
  }

  var response = {};

  async.waterfall([
    // @todo : add news
    // @todo : add user statistics

    function featuredGroups (callback) {
      retrieveFeaturedGroups(limit, function (err, list, more) {
        if (!err) {
          response.groups = {
            list: list,
            more: more
          };
        }
        return callback(err);
      });
    },
    function featuredRooms (callback) {
      retrieveFeaturedRooms(limit, function (err, list, more) {
        if (!err) {
          response.rooms = {
            list: list,
            more: more
          };
        }
        return callback(err);
      });
    }
  ], function (err) {
    if (err) {
      logger.error(err);
      return res.json({err: err});
    }

    return res.json(response);
  });
});

module.exports = router;

var retrieveFeaturedGroups = function (number, callback) {
  var q = GroupModel
    // @todo : probably need to add additional field
    .find({visibility: true, deleted: {$ne: true}})
    .sort({priority: -1})
    .limit(number + 1)
    .populate('owner', 'username');

  q.exec(function (err, groups) {
    if (err) {
      return callback(err);
    }
    if (!groups.length) {
      return callback(null, [], false);
    }

    var more = false;
    if (groups.length > number) {
      more = true;
      groups.pop();
    }

    var list = _.map(groups, function (group) {
      var _data = {
        group_id: group.id,
        name: group.name,
        identifier: group.getIdentifier(),
        avatar: group._avatar(),
        description: group.description,
        members: group.countMembers(),
        rooms: []
      };

      if (group.owner) {
        _data.owner_id = group.owner.id;
        _data.owner_username = group.owner.username;
      }

      return _data;
    });

    return callback(null, list, more);
  });
};

var retrieveFeaturedRooms = function (number, callback) {
  var q = RoomModel
    // @todo : probably need to add additional field
    .find({visibility: true, deleted: {$ne: true}})
    .sort({priority: -1})
    .limit(number + 1)
    .populate('group', 'name avatar')
    .populate('owner', 'username');

  q.exec(function (err, rooms) {
    if (err) {
      return callback(err);
    }
    if (!rooms.length) {
      return callback(null, [], false);
    }

    var more = false;
    if (rooms.length > number) {
      more = true;
      rooms.pop();
    }

    var list = _.map(rooms, function (room) {
      var _data = {
        room_id: room.id,
        name: room.name,
        identifier: room.getIdentifier(),
        avatar: room._avatar(),
        description: room.description,
        mode: room.mode,
        users: room.users && room.users.length ? room.users.length : 0
      };

      if (room.group) {
        _data.group_id = room.group.id;
        _data.group_name = room.group.name;
        _data.group_avatar = room.group._avatar();
      }

      if (room.owner) {
        _data.owner_id = room.owner.id;
        _data.owner_username = room.owner.username;
      }

      return _data;
    });

    return callback(null, list, more);
  });
};

