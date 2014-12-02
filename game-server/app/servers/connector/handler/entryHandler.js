var debug = require('debug')('donut:server:entryHandler');

module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
		this.app = app;
};

var handler = Handler.prototype;

/**
 * New client entry chat server.
 *
 * @param  {Object}   msg     request message
 * @param  {Object}   session current session object
 * @param  {Function} next    next stemp callback
 * @return {Void}
 */
handler.enter = function(msg, session, next) {
	var self = this;

	// determine uid
	var uid = false;
	if (session
		&& session.__session__
		&& session.__session__.__socket__
		&& session.__session__.__socket__.socket)
		uid = session.__session__.__socket__.socket.getUserId();

	// duplicate log in
	if(!uid)
		return next(null, { code: 500, error: true });

	//var rid = msg.rid;
	var sessionService = self.app.get('sessionService');

	// duplicate log in
	if(!!sessionService.getByUid(uid))
		return next(null, { code: 500, error: true });

	debug('session bound to user: '+uid);
	session.bind(uid);
	//session.set('rid', rid);
	//session.push('rid', function(err) {
	//	if(err) {
	//		console.error('set rid for session service failed! error is : %j', err.stack);
	//	}
	//});
	session.on('closed', onUserLeave.bind(null, self.app));

	// put user into channel
	//self.app.rpc.chat.chatRemote.add(session, uid, self.app.get('serverId'), rid, true, function(users){
	//	next(null, {
	//		users:users
	//	});
	//});
	var socket = session.__session__.__socket__.socket;
	var welcome = {
		hello: 'salut %u',
		user: {
			user_id: socket.getUserId(),
			username: socket.getUsername(),
			avatar: socket.getAvatar(),
			color: socket.getColor(),
			welcome: true
		},
		rooms: [],
		onetoones: []
	};
	return next(null, welcome);
};

/**
 * User log out handler
 *
 * @param {Object} app current application
 * @param {Object} session current session object
 *
 */
var onUserLeave = function(app, session) {
	if(!session || !session.uid) {
		return;
	}
	//app.rpc.chat.chatRemote.kick(session, session.uid, app.get('serverId'), session.get('rid'), null);
};