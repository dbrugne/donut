var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);
var Log = require('../../../../../shared/models/log');

module.exports = function(data) {
  logger.trace('[schedule:cleanupLogs] starting');

  var FourteenDays = new Date(); FourteenDays.setDate(new Date().getDate() - 14); // older than 2 weeks
  var SevenDays = new Date(); SevenDays.setDate(new Date().getDate() - 7); // older than 7 days
  Log.remove({
    $or: [
      { category: {$ne: 'donut'}, timestamp: {$lte: FourteenDays}, 'level.level': {$lte: 20000} },
      { 'level.level': {$lte: 10000}, timestamp: {$lte: SevenDays} }
    ]
  }, function (err) {
    if (err)
      return logger.error('[schedule:cleanupLogs] error: '+err);

    logger.trace('[schedule:cleanupLogs] done');
  });
};