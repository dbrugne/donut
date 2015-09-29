'use strict';
var logger = require('../../../../../shared/util/logger').getLogger('donut', __filename);
var featuredRooms = require('../../../../../shared/util/featured-rooms');

module.exports = function (data) {
  logger.trace('[schedule:featuredRooms] starting');

  featuredRooms(data.app, function (err, roomsData) {
    if (err) {
      return logger.error('[schedule:featuredRooms] error: ' + err);
    }

    logger.trace('[schedule:featuredRooms] done (' + roomsData.length + ')');
  });
};
