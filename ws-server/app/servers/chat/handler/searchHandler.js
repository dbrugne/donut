'use strict';
var logger = require('../../../../../shared/util/logger').getLogger('donut', __filename.replace(__dirname + '/', ''));
var _ = require('underscore');
var search = require('../../../../../shared/util/search');

var Handler = function (app) {
  this.app = app;
};

module.exports = function (app) {
  return new Handler(app);
};

var handler = Handler.prototype;

handler.call = function (data, session, next) {
  var user = session.__currentUser__;

  // at least look into something
  if (!(data.options.users || data.options.rooms || data.options.groups)) {
    return next(null, {});
  }

  // at least look for something
  if (!(data.search || data.options.group_name)) {
    return next(null, {});
  }

  var options = _.clone(data.options);
  options.app = this.app;
  options.user_id = user.id;

  search(data.search, options, function (err, results) {
    if (err) {
      logger('[search] ' + err);
      return next(null, {code: 500, err: 'internal'});
    }

    return next(null, results);
  });
};
