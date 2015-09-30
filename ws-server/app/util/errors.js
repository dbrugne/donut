var logger = require('../../../shared/util/logger').getLogger('donut');

var errors = {
  params: 400,
  unknown: 404,
  notallowed: 403,
  internal: 500
};

module.exports = {
  errors: errors,
  getHandler: function (handlerName, callback) {
    return function (err) {
      if (!errors[err]) {
        logger.error('[' + handlerName + '] ' + err);
        return callback(null, { code: 500, err: 'internal' });
      }

      logger.warn('[' + handlerName + '] ' + err);
      callback(null, { code: errors[err], err: err });
    };
  }
};
