var logger = require('../../../../pomelo-logger').getLogger('donut', __filename);

module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;
};

var handler = Handler.prototype;

/**
 * Retrieve current status for user
 *
 * @param {Object} msg message from client
 * @param {Object} session
 * @param  {Function} next next stemp callback
 *
 */
handler.status = function(msg, session, next) {
	if (!msg.uid)
	  return;

	logger.debug('statusHandler for: '+msg.uid);

	this.app.statusService.getStatusByUid(msg.uid, function(err, result) {
		if (err)
			logger.error('Error while retrieving user status: '+err);

		next(null, {
			result: result
		});
	});
};

/**
 * Retrieve current status for users
 *
 * @param {Object} msg message from client
 * @param {Object} session
 * @param  {Function} next next stemp callback
 *
 */
handler.statusMulti = function(msg, session, next) {
	if (!msg.uids || !Array.isArray(msg.uids))
		return next(null, {error: 'statusMulti: uids should be an array', code: 500});

	logger.debug('statusHandler.statusMulti for: ', msg.uids);

	this.app.statusService.getStatusByUids(msg.uids, function(err, result) {
		if (err)
			logger.error('Error while retrieving user status: '+err);

		next(null, {
			result: result
		});
	});
};

//var _ = require('underscore');
//
//function emit(socket, message) {
//	socket.emit('room:message', {
//		name: '#donut',
//		time: Date.now(),
//		message: message,
//		user_id: socket.getUserId(),
//		username: socket.getUsername(),
//		avatar: socket.getAvatar(),
//		color: socket.getColor()
//	});
//}
//
//module.exports = function(io, socket, data, callback) {
//
//	if (data.message.substring(0, 6) == '/hello') {
//		emit(socket, 'Hello from server');
//		return callback('admin');
//	}
//
//	if (data.message.substring(0, 8) == '/onlines') {
//		var list = {};
//		_.each(io.sockets.adapter.nsp.connected, function(s) {
//			if (!list[s.getUserId()])
//				list[s.getUserId()] = {
//					username: s.getUsername(),
//					sockets: [s.id]
//				};
//			else
//				list[s.getUserId()].sockets.push(s.id);
//		});
//		var message = 'online users\n';
//		_.each(list, function(u) {
//			message += '- '+u.username+'\n';
//			_.each(u.sockets, function(s) {
//				message += '  ° '+s+'\n';
//			});
//		});
//		emit(socket, message);
//		return callback('admin');
//	}
//
//	return callback('admin');
//};