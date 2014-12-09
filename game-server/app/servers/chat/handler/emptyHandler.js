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

	console.log('METHOD for: '+data.uid);

	next(null, {});
};