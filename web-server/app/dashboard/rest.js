var debug = require('debug')('donut:web:admin');
var _ = require('underscore');
var express = require('express');
var router = express.Router();
var Room = require('../../../shared/models/room');
var User = require('../../../shared/models/user');

var isAdmin = function(req, res, next) {
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
    var pattern = query.q.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
    var regexp = new RegExp(pattern,'i');
    var filters = [];
    _.each(searchable, function(s) {
      var f = {};
      f[s] = regexp;
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

  collection.count(filter).exec(function(err, count) {
    if(err)
      throw err;

    var q = collection
      .find(filter)
      .sort(sortOrder)
      .skip((page - 1)*limit)
      .limit(limit);

    if (populate) {
      q.populate(populate.path, populate.fields);
    }

    q.exec(function(err, docs) {
      if(err)
        throw err;
      return callback({
        items: docs,
        totalRecords: count
      });
    });
  });
};

router.get('/rest/rooms', isAdmin, function(req, res) {
  readCollection(
    Room,
    req.query,
    ['name'],
    {path: 'owner', fields: 'username avatar color facebook'},
    function(result) {
      res.send(result);
    }
  );
});

router.get('/rest/users', isAdmin, function(req, res) {
  readCollection(
    User,
    req.query,
    ['username','name','local.email','facebook.name'],
    null,
    function(result) {
      res.send(result);
    }
  );
});

module.exports = router;