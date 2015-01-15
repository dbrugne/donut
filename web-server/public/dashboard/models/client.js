define([
	'underscore',
	'backbone',
	'socket.io'
], function (_, Backbone, io) {
	//var ClientModel = Backbone.Model.extend({
  //
	//	initialize: function(options) {
	//
	//	}
  //
	//});
  //
	//return new ClientModel();
	var cloneError = function(origin) {
		// copy the stack infos for Error instance json result is empty
		if (!(origin instanceof Error)) {
			return origin;
		}
		var res = {
			message: origin.message,
			stack: origin.stack
		};
		return res;
	};

	var Protocol = function() {
		this.PRO_OK = 1;
		this.PRO_FAIL = -1;
	}

	Protocol.prototype = {
		composeRequest: function(id, moduleId, body) {
			if (id) {
				// request message
				return JSON.stringify({
					reqId: id,
					moduleId: moduleId,
					body: body
				});
			} else {
				// notify message
				return {
					moduleId: moduleId,
					body: body
				};
			}
		},

		composeResponse: function(req, err, res) {
			if (req.reqId) {
				// request only
				return JSON.stringify({
					respId: req.reqId,
					error: cloneError(err),
					body: res
				});
			}
			// invalid message(notify dose not need response)
			return null;
		},

		composeCommand: function(id, command, moduleId, body) {
			if (id) {
				// command message
				return JSON.stringify({
					reqId: id,
					command: command,
					moduleId: moduleId,
					body: body
				});
			} else {
				return JSON.stringify({
					command: command,
					moduleId: moduleId,
					body: body
				});
			}
		},

		parse: function(msg) {
			if (typeof msg === 'string') {
				return JSON.parse(msg);
			}
			return msg;
		},

		isRequest: function(msg) {
			return (msg && msg.reqId);
		}
	}

	Protocol.PRO_OK = 1;
	Protocol.PRO_FAIL = -1;

	var protocol = new Protocol();


	var Client = function(opt) {
		this.id = "";
		this.reqId = 1;
		this.callbacks = {};
		this.listeners = {};
		this.state = Client.ST_INITED;
		this.socket = null;
		opt = opt || {};
		this.username = opt['username'] || "";
		this.password = opt['password'] || "";
		this.md5 = opt['md5'] || false;
	};

	Client.prototype = {
		connect: function(id, host, port, cb) {
			this.id = id;
			var self = this;
			var url = 'http://'+host;
			if(port) {
				url +=  ':' + port;
			}

			this.socket = io.connect(url, {
				'force new connection': true,
				'reconnect': false
			});

			this.socket.on('connect', function() {
				console.log('connected to '+url);
				self.state = Client.ST_CONNECTED;
				self.socket.emit('register', {
					type: "client",
					id: id,
					username: self.username,
					password: self.password,
					md5: self.md5
				});
			});

			this.socket.on('register', function(res) {
				if (res.code !== protocol.PRO_OK) {
					cb(res.msg);
					return;
				}

				self.state = Client.ST_REGISTERED;
				cb();
			});

			this.socket.on('client', function(msg) {
				msg = protocol.parse(msg);
				if (msg.respId) {
					// response for request
					var cb = self.callbacks[msg.respId];
					delete self.callbacks[msg.respId];
					if (cb && typeof cb === 'function') {
						cb(msg.error, msg.body);
					}
				} else if (msg.moduleId) {
					// notify
					self.emit(msg.moduleId, msg);
				}
			});

			this.socket.on('error', function(err) {
				if (self.state < Client.ST_CONNECTED) {
					cb(err);
				}

				self.emit('error', err);
			});

			this.socket.on('disconnect', function(reason) {
				this.state = Client.ST_CLOSED;
				self.emit('close');
			});
		},

		request: function(moduleId, msg, cb) {
			var id = this.reqId++;
			// something dirty: attach current client id into msg
			msg = msg || {};
			msg.clientId = this.id;
			msg.username = this.username;
			var req = protocol.composeRequest(id, moduleId, msg);
			this.callbacks[id] = cb;
			this.socket.emit('client', req);
		},

		notify: function(moduleId, msg) {
			// something dirty: attach current client id into msg
			msg = msg || {};
			msg.clientId = this.id;
			msg.username = this.username;
			var req = protocol.composeRequest(null, moduleId, msg);
			this.socket.emit('client', req);
		},

		command: function(command, moduleId, msg, cb) {
			var id = this.reqId++;
			msg = msg || {};
			msg.clientId = this.id;
			msg.username = this.username;
			var commandReq = protocol.composeCommand(id, command, moduleId, msg);
			this.callbacks[id] = cb;
			this.socket.emit('client', commandReq);
		},

		on: function(event, listener) {
			this.listeners[event] = this.listeners[event] || [];
			this.listeners[event].push(listener);
		},

		emit: function(event) {
			var listeners = this.listeners[event];
			if (!listeners || !listeners.length) {
				return;
			}

			var args = Array.prototype.slice.call(arguments, 1);
			var listener;
			for (var i = 0, l = listeners.length; i < l; i++) {
				listener = listeners[i];
				if (typeof listener === 'function') {
					listener.apply(null, args);
				}
			}
		}
	};

	Client.ST_INITED = 1;
	Client.ST_CONNECTED = 2;
	Client.ST_REGISTERED = 3;
	Client.ST_CLOSED = 4;

	var client = window.client = new Client({
		username: 'admin',
		password: 'admin',
		md5: false
	});
	return client;

});