'use strict';

var logger = require('pomelo-logger').getLogger('web', __filename);
var express = require('express');
var router = express.Router();
var async = require('async');
var _ = require('underscore');
var common = require('@dbrugne/donut-common/server');

var HistoryRoomModel = require('../../../shared/models/historyroom');
var HistoryOneModel = require('../../../shared/models/historyone');

var authorization = require('../middlewares/authorization');
var parameters = require('../middlewares/parameters');

router.route('/api/history').post([authorization, parameters], function (req, res) {
  var user = req.user;
  var room = req.__room;
  var one = req.__user;

  var direction = (req.body.direction === 'older')
    ? 'older'
    : 'later';

  var limit = parseInt(req.body.limit, 10);
  if (!_.isNumber(limit) || _.isNaN(limit) || limit > 100) {
    limit = 100;
  }

  var response = {
    history: [],
    more: false
  };

  async.waterfall([
    function checkParams (callback) {
      if (!room && !one) {
        return callback('no-discussion');
      }

      if (room && !room.isIn(user.id)) {
        return callback('not-in');
      }

      return callback(null);
    },
    function request (callback) {
      /**
       * We can request a discussion history in following ways:
       * - initial load: last n events from last in desc direction
       * - load more: from 'id' in desc direction
       * - refocus: from last until 'id' in desc direction
       */
      var criteria = {};

      // event id
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

      q.sort({_id: 'desc'});
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
      logger.error(err);
      return res.json({err: err});
    }

    return res.json(response);
  });
});

module.exports = router;
