'use strict';
var debug = require('debug')('donut:web:admin');
var async = require('async');
var _ = require('underscore');
var express = require('express');
var router = express.Router();
var Room = require('../../../shared/models/room');
var User = require('../../../shared/models/user');
var HistoryRoom = require('../../../shared/models/historyroom');
var HistoryOne = require('../../../shared/models/historyone');
var common = require('@dbrugne/donut-common');

var isAdmin = function (req, res, next) {
  if (!req.isAuthenticated() || req.user.admin !== true) {
    debug('Someone tried to access /dashboard without being authenticated as admin user');
    return res.redirect('/');
  }
  next();
};

var readCollection = function (collection, query, searchable, populate, callback) {
  debug(query);

  // filter
  var filter = {};
  if (query.q && searchable) {
    var search = common.regExpBuildExact(query.q);
    var filters = [];
    _.each(searchable, function (s) {
      var f = {};
      f[s] = search;
      filters.push(f);
    });
    filter['$or'] = filters;
  }

  // limit
  var page = query.page || 1;
  var limit = query.per_page || 25;

  // sort
  var sortOrder = {};
  var sort = query.sort_by || 'name';
  var order = query.order || 'asc';
  sortOrder[sort] = order;

  collection.count(filter).exec(function (err, count) {
    if (err)
      throw err;

    var q = collection
      .find(filter)
      .sort(sortOrder)
      .skip((page - 1) * limit)
      .limit(limit);

    if (populate) {
      q.populate(populate.path, populate.fields);
    }

    q.exec(function (err, docs) {
      if (err)
        throw err;
      return callback({
        items: docs,
        totalRecords: count
      });
    });
  });
};

router.get('/rest/rooms', isAdmin, function (req, res) {
  readCollection(
    Room,
    req.query,
    ['name'],
    {path: 'owner', fields: 'username avatar color facebook'},
    function (result) {
      res.send(result);
    }
  );
});

router.get('/rest/rooms/:id', isAdmin, function (req, res) {
  if (!req.params.id) {
    debug('No id given while retrieving room in /rest/rooms/:id: ' + err);
    return res.send({});
  }

  var id = req.params.id.replace('%23', '#');
  var q = Room.findById(id);
  q.populate('owner', 'username color facebook');
  q.populate('op', 'username color facebook');
  q.populate('users', 'username color facebook');
  q.exec(function (err, result) {
    if (err) {
      debug('Error while retrieving room in /rest/rooms/:id: ' + err);
      return res.send({});
    }

    res.send(result);
  });
});

router.get('/rest/users', isAdmin, function (req, res) {
  readCollection(
    User,
    req.query,
    ['username', 'name', 'local.email', 'facebook.name'],
    null,
    function (result) {
      res.send(result);
    }
  );
});

router.get('/rest/users/:id', isAdmin, function (req, res) {
  if (!req.params.id) {
    debug('No id given while retrieving user in /rest/users/:id: ' + err);
    return res.send({});
  }

  var id = req.params.id;
  var q = User.findById(id);
  q.populate('onetoones', 'username');
  q.exec(function (err, user) {
    if (err) {
      debug('Error while retrieving user in /rest/users/:id: ' + err);
      return res.send({});
    }

    var data = user.toJSON();
    Room.findByUser(user.id)
      .exec(function (err, rooms) {
        if (err) {
          debug('Error while retrieving rooms in /rest/users/:id: ' + err);
          return res.send({});
        }

        if (!rooms || !rooms.length)
          return res.send(data);

        data.rooms = _.map(rooms, function (r) {
          return {
            id: r.id,
            name: r.name
          };
        });
        res.send(data);
      });
  });
});

router.get('/rest/home', isAdmin, function (req, res) {
  async.parallel([

    // 0
    function usersTotal (callback) {
      User.count().exec(callback);
    },
    // 1
    function usersTrend (callback) {
      var since = Date.now() - (1000 * 3600 * 24 * 7);
      User.where('created_at').gte(since).count().exec(callback);
    },
    // 2
    function roomsTotal (callback) {
      Room.count().exec(callback);
    },
    // 3
    function roomsTrend (callback) {
      var since = Date.now() - (1000 * 3600 * 24 * 7);
      Room.where('created_at').gte(since).count().exec(callback);
    },
    // 4
    function roomMessage (callback) {
      HistoryRoom.find({event: { $in: ['room:message'] }}).count().exec(callback);
    },
    // 5
    function userMessage (callback) {
      HistoryOne.find({event: { $in: ['user:message'] }}).count().exec(callback);
    }

  ], function (err, result) {
    if (err)
      throw err;

    res.send({
      time: Date.now(),
      users: {
        total: result[0],
        trend: result[1]
      },
      rooms: {
        total: result[2],
        trend: result[3]
      },
      messages: {
        total: result[4] + result[5]
      }
    });
  });
});

module.exports = router;
