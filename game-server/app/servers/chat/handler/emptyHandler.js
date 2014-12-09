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
 * @param {Object} msg message from client
 * @param {Object} session
 * @param  {Function} next stemp callback
 *
 */
handler.METHOD = function(msg, session, next) {
	if (!msg.uid)
	  return;

	console.log('METHOD for: '+msg.uid);

	next(null, {});
};