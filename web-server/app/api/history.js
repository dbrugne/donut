'use strict';

var logger = require('pomelo-logger').getLogger('web', 'ws:history');
var express = require('express');
var router = express.Router();
var async = require('async');
var _ = require('underscore');
var jwt = require('jsonwebtoken');
var conf = require('../../../config/');
var common = require('@dbrugne/donut-common/server');

var UserModel = require('../../../shared/models/user');
var RoomModel = require('../../../shared/models/room');
var HistoryRoomModel = require('../../../shared/models/historyroom');
var HistoryOneModel = require('../../../shared/models/historyone');

router.route('/api/history').post(function (req, res) {
  var user;
  var room;
  var one;

  var direction = (req.body.direction === 'older')
    ? 'older'
    : 'later';

  var limit = parseInt(req.body.limit);
  if (!_.isNumber(limit)) {
    limit = 100;
  }

  var response = {
    history: [],
    more: false
  };

  async.waterfall([
    function checkParams (callback) {
      if (!req.body.token) {
        return callback();
      }
      if (!req.body.room_id && !req.body.user_id) {
        return callback();
      }

      return callback(null);
    },
    // @todo factorize middleware
    function checkToken (callback) {
      var token = req.body.token;
      jwt.verify(token, conf.oauth.secret, function (err, decoded) {
        if (err) {
          return callback(err);
        }
        if (!decoded.id) {
          return callback('invalid-token');
        }

        UserModel.findOne({_id: decoded.id}, function (err, _user) { // @todo : populate
          if (err) {
            return callback(err);
          }
          if (!_user) {
            return callback('unknown-user');
          }

          user = _user;
          return callback(null);
        });
      });
    },
    // @todo factorize middleware
    function checkRoom (callback) {
      if (!req.body.room_id) {
        return callback(null);
      }
      RoomModel.findOne({_id: req.body.room_id}, function (err, _room) {
        if (err) {
          return callback(err);
        }
        if (!_room) {
          return callback('not-found');
        }
        if (!_room.isIn(user.id)) {
          return callback('not-in');
        }

        room = _room;
        return callback(null);
      });
    },
    // @todo factorize middleware
    function checkOne (callback) {
      if (!req.body.user_id) {
        return callback(null);
      }
      UserModel.findOne({_id: req.body.user_id}, function (err, _one) {
        if (err) {
          return callback(err);
        }
        if (!_one) {
          return callback('not-found');
        }

        one = _one;
        return callback(null);
      });
    },
    function request (callback) {
      /**
       * We can request a discussion history in following ways:
       * - initial load: last n events from last in desc direction
       * - load more: from 'id' in desc direction
       * - refocus: from last until 'id' in desc direction
       */
      var criteria = {};

      if (req.body.id && common.validate.objectId(req.body.id)) {
        var operator = (direction === 'older')
          ? '$lt'
          : '$gt';
        criteria._id = {};
        criteria._id[operator] = req.body.id;
      }

      var q;
      if (room) {
        response.room_id = room.id;
        criteria.room = room.id;
        q = HistoryRoomModel.find(criteria);
      } else {
        response.user_id = one.id;
        criteria['$or'] = [
          { from: user._id, to: one._id },
          { from: one._id, to: user._id }
        ];
        q = HistoryOneModel.find(criteria);
      }

      q.sort({ _id: 'desc' });
      q.limit(limit + 1);

      // population
      if (room) {
        q.populate('room', 'name')
          .populate('user', 'realname username avatar facebook')
          .populate('by_user', 'realname username avatar facebook');
      } else {
        q.populate('from', 'realname username avatar facebook')
          .populate('to', 'realname username avatar facebook');
      }

      q.exec(callback);
    },
    function history (docs, callback) {
      response.more = (docs.length > limit);
      if (response.more) {
        // remove last
        docs.pop();
      }

      _.each(docs, function (model) {
        response.history.push(model.toClientJSON());
      });

      // events are sent in chronological order
      response.history.reverse();

      return callback(null);
    }
  ], function (err) {
    if (err) {
      logger.err(err);
      return res.json({err: err});
    }

    return res.json(response);
  });
});

module.exports = router;
