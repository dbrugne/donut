var logger = require('pomelo-logger').getLogger('pomelo', __filename);
var dispatcher = require('../../../util/dispatcher');

module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;
};

var handler = Handler.prototype;

/**
 * Gate handler that dispatch user to connectors based on user ID
 * A user can have more than one socket (=devices), so if we use the user ID to
 * dispatch connection on connector a same user will have all its sockets on the
 * same frontend (connector) server.
 *
 * @param {Object} msg message from client
 * @param {Object} session
 * @param {Function} next next step callback
 *
 */
handler.queryEntry = function(msg, session, next) {
	// determine uid
	var uid = false;
	if (session
		&& session.__session__
		&& session.__session__.__socket__
		&& session.__session__.__socket__.socket)
		uid = session.__session__.__socket__.socket.getUserId();

	if (!uid)
		return next(null, {code: 500});

	logger.debug('dispatch this user: '+uid);

	// get all connectors
	var connectors = this.app.getServersByType('connector');
	if(!connectors || connectors.length === 0)
		return next(null, {code: 500});

	// select connector, because more than one connector existed.
	var res = dispatcher.dispatch(uid, connectors);
	logger.debug('dispatched user '+uid+' to: ');
	next(null, {
		code: 200,
		host: res.host,
		port: res.clientPort
	});
};
