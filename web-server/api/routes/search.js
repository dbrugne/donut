'use strict';

var logger = require('pomelo-logger').getLogger('web', __filename);
var express = require('express');
var router = express.Router();
var _ = require('underscore');
var async = require('async');
var common = require('@dbrugne/donut-common/server');
var diacritics = require('diacritics').remove;
var pomelo = require('../../../shared/io/pomelo');

var authorization = require('../middlewares/authorization');

var decorateGroups = function (ids, bag, callback) {
  async.eachLimit(bag.list, 5, function (item, fn) {
    var q = require('../../../shared/models/room')
      .find({
        group: item.group_id,
        deleted: {$ne: true}
      })
      .select('avatar')
      .sort('-last_event_at')
      .limit(4);
    q.exec(function (err, docs) {
      if (err) {
        return fn(err);
      }
      if (!docs.length) {
        return fn(null);
      }

      item.rooms = [];
      _.each(docs, function (doc) {
        item.rooms.push({
          room_id: doc.id,
          avatar: doc._avatar()
        });
      });

      return fn(null);
    });
  }, function (err) {
    return callback(err, bag);
  });
};

var decorateUsers = function (ids, bag, callback) {
  pomelo.usersStatus(ids, function (err, statuses) {
    if (err) {
      return callback(err);
    }
    _.each(bag.list, function (element, index) {
      element.status = (statuses[index] === 1)
        ? 'online'
        : 'offline';
    });

//    if (groupId) {
//      // @todo : decorate with group role
//    } else if (roomId) {
//      // @todo : decorate with room role
//    }

    return callback(null, bag);
  });
};

var searchHelper = function (type, search, limit, skip, groupId, roomId, full, callback) {
  // collection
  var searchOn;
  var sort;
  var select;
  var collection;
  if (type === 'groups') {
    searchOn = ['name'];
    sort = '-last_event_at -members avatar name';
    select = (full)
      ? 'name avatar description owner members op last_event_at'
      : 'name avatar description';
    collection = require('../../../shared/models/group');
  } else if (type === 'rooms') {
    searchOn = ['name'];
    sort = '-last_event_at -users avatar name';
    select = (full)
      ? 'name group avatar mode description allow_user_request allow_group_member owner users last_event_at'
      : 'name group avatar mode description allow_user_request allow_group_member';
    collection = require('../../../shared/models/room');
  } else {
    searchOn = ['username', 'realname'];
    sort = '-lastonline_at -lastoffline_at -avatar username';
    select = (full)
      ? 'username realname avatar facebook bio location'
      : 'username realname avatar facebook bio';
    collection = require('../../../shared/models/user');
  }

  // criteria
  var criteria = {deleted: {$ne: true}};
  if (search && searchOn) {
    criteria['$or'] = [];
    _.each(searchOn, function (attribute) {
      var _crit = {};
      _crit[attribute] = search;
      criteria['$or'].push(_crit);
    });
  }

  if (groupId) {
    // filter_on_group_id
    criteria.group = groupId;
  } else if (roomId) {
    // filter_on_room_id
    criteria.room = roomId;
  }

  // filter_on_group_role
  // filter_on_room_role
  // @todo : first run to get room/group.members/users ID list and add to criteria

  // query
  var q = collection.find(criteria, select);
  q.sort(sort);
  q.skip(skip);
  q.limit(limit + 1);

  // populate
  if (type === 'groups') {
    q.populate('owner', 'username');
  } else if (type === 'rooms') {
    q.populate('owner', 'username');
    q.populate('group', 'name avatar');
  } else if (type === 'users') {
    // nothing for now
  }

  // run and compute output
  q.exec(function (err, docs) {
    if (err) {
      return callback(err);
    }

    var bag = {
      list: [],
      more: false
    };
    if (!docs.length) {
      return callback(null, bag);
    }

    // more
    bag.more = (docs.length > limit);
    if (bag.more) {
      // remove last
      docs.pop();
    }

    // list
    var ids = [];
    if (docs.length) {
      _.each(docs, function (doc) {
        ids.push(doc.id);
        bag.list.push(doc.toClientJSON());
      });
    }

    // decoration
    if (type === 'groups') {
      decorateGroups(ids, bag, callback);
    } else if (type === 'rooms') {
      callback(null, bag);
    } else if (type === 'users') {
      decorateUsers(ids, bag, callback);
    }
  });
};

/**
 * Search in database rooms, groups and/or users.
 *
 * @param options: {
 *    type: enum(groups,rooms,users,all)
 *    search: String
 *    limit: integer
 *    skip: integer
 *    full: Boolean                     results are decorated with a large set of fields
 *    begin: Boolean                    search only for document name that begin with 'search'
 *    filter_on_group_id: String        search only for rooms/users that are in this group id
 *    filter_on_group_role: enum(members,op,allowed,pending,ban)
 *    filter_on_room_id: String         search only for users that are in this room id
 *    filter_on_room_role: enum(users,op,allowed,pending,ban)
 * }
 * @return {
 *  list: [],
 *  more: Boolean
 * }
 */
router.route('/api/search').post([authorization], function (req, res) {
  if (!req.body || !req.body.type || ['groups', 'rooms', 'users', 'all'].indexOf(req.body.type) === -1) {
    return res.json({err: 'invalid'});
  }

  // type
  var type = req.body.type;

  // search
  var search;
  if (req.body.search) {
    var begin = (req.body.begin === true);

    // remove diacritic, @ and #
    var _search = req.body.search;
    _search = _search.replace(/([@#])/g, '');
    _search = diacritics(_search);

    // regexp
    if (_search) {
      search = (begin === true)
        ? common.regexp.starts(_search)
        : common.regexp.contains(_search);
    }
  }

  // limit
  var limit = parseInt(req.body.limit, 10);
  if (!_.isNumber(limit) || _.isNaN(limit) || limit > 10) {
    limit = 10;
  }

  // skip
  var skip = parseInt(req.body.skip, 10);
  if (!_.isNumber(skip) || _.isNaN(skip)) {
    skip = 0;
  }

  // filter_on_group_id
  var groupId;
  if (req.body.filter_on_group_id &&
    common.validate.objectId(req.body.filter_on_group_id) &&
    (type === 'rooms' || type === 'users')) {
    groupId = req.body.filter_on_group_id;
  }

  // filter_on_room_id
  var roomId;
  if (req.body.filter_on_room_id &&
    common.validate.objectId(req.body.filter_on_room_id) &&
    type === 'users') {
    roomId = req.body.filter_on_room_id;
  }

  // specials
  var full = (req.body.full === true);

  // call helper
  if (type === 'all') {
    async.series([
      function (fn) {
        searchHelper('groups', search, limit, skip, null, null, full, fn);
      },
      function (fn) {
        searchHelper('rooms', search, limit, skip, null, null, full, fn);
      },
      function (fn) {
        searchHelper('users', search, limit, skip, null, null, full, fn);
      }
    ], function (err, bags) {
      if (err) {
        logger.error(err);
        return res.json({err: err});
      }

      return res.json({
        groups: bags[0],
        rooms: bags[1],
        users: bags[2]
      });
    });
  } else {
    searchHelper(type, search, limit, skip, groupId, roomId, full, function (err, bag) {
      if (err) {
        logger.error(err);
        return res.json({err: err});
      }

      return res.json(bag);
    });
  }
});

module.exports = router;
