var logger = require('pomelo-logger').getLogger('donut', __filename);
module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;
};

var handler = Handler.prototype;

/**
 * Description
 *
 * @param {Object} data message from client
 * @param {Object} session
 * @param  {Function} next stemp callback
 *
 */
handler.METHOD = function(data, session, next) {
	if (!data.uid)
	  return;

	logger.info('METHOD for: '+data.uid);

	next(null, {});
};