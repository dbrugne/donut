'use strict';
var logger = require('../../../../../shared/util/logger').getLogger('donut', __filename.replace(__dirname + '/', ''));
var search = require('../../../../../shared/util/search');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function (data, session, next) {
  if (!data.search && !data.with_group) {
    return next(null, {});
  }

  var searchInUsers = (data.users && data.users === true);
  var searchInRooms = (data.rooms && data.rooms === true);
  if (!searchInUsers && !searchInRooms) {
    return next(null, {});
  }

  var withGroups = (data.with_group && data.rooms) ? data.with_group : false;

  var lightSearch = (data.light && data.light === true);

  var limit = (data.limit) ? data.limit : 150;

  var skip = (data.skip) ? data.skip : 0;

  var withPrivateRoomsInGroup = (data.private_group_rooms && data.rooms);

  search(data.search, searchInUsers, searchInRooms, withGroups, limit, skip, lightSearch, withPrivateRoomsInGroup, function (err, results) {
    if (err) {
      logger('[search] ' + err);
      return next(null, {code: 500, err: 'internal'});
    }

    return next(null, results);
  });
};
