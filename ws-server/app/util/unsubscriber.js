var _ = require('underscore');
var async = require('async');

module.exports = function (app, userId, roomIds, callback) {
  if (_.isString(roomIds)) {
    roomIds = [roomIds];
  }

  if (!userId || !roomIds || !roomIds.length) {
    return callback(null);
  }

  // search for all the user sessions (any frontends)
  app.statusService.getSidsByUid(userId, function (err, sids) {
    if (err) {
      return callback(err);
    }

    // the targeted user could be offline at this time
    if (!sids || sids.length < 1) {
      return callback(null);
    }

    var parallels = [];
    _.each(sids, function (sid) {
      _.each(roomIds, function (id) {
        parallels.push(function (fn) {
          app.globalChannelService.leave(id, userId, sid, function (err) {
            if (err) {
              return fn(userId + sid + ': ' + err);
            }

            return fn(null);
          });
        });
      });
    });
    async.parallel(parallels, function (err, results) {
      return callback(err);
    });
  });
};
