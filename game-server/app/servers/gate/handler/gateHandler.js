var debug = require('debug')('donut:server:gateHandler');
var dispatcher = require('../../../util/dispatcher');

module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;
};

var handler = Handler.prototype;

/**
 * Gate handler that dispatch user to connectors based on 'username'
 *
 * @param {Object} msg message from client
 * @param {Object} session
 * @param {Function} next next step callback
 *
 */
handler.queryEntry = function(msg, session, next) {
	// determine username
	var username = false;
	if (session
		&& session.__session__
		&& session.__session__.__socket__
		&& session.__session__.__socket__.socket
		&& session.__session__.__socket__.socket.request
		&& session.__session__.__socket__.socket.request.user
		&& session.__session__.__socket__.socket.request.user.username)
		username = session.__session__.__socket__.socket.request.user.username;

	if (!username)
		return next(null, {code: 500});

	debug('dispatch this user: '+username);

	// get all connectors
	var connectors = this.app.getServersByType('connector');
	if(!connectors || connectors.length === 0)
		return next(null, {code: 500});

	// select connector, because more than one connector existed.
	var res = dispatcher.dispatch(username, connectors);
	next(null, {
		code: 200,
		host: res.host,
		port: res.clientPort
	});
};
