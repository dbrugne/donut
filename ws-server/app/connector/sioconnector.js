'use strict';
var logger = require('../../../shared/util/logger').getLogger('donut', __filename);
var conf = require('../../../config/index');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var socketio = require('socket.io');
var SocketioPomeloSocket = require('./sioPomeloSocket');
var socketioRedis = require('socket.io-redis');
var socketioJwt = require('socketio-jwt');
var User = require('../../../shared/models/user');
var PKG_ID_BYTES = 4;
var PKG_ROUTE_LENGTH_BYTES = 1;
var PKG_HEAD_BYTES = PKG_ID_BYTES + PKG_ROUTE_LENGTH_BYTES;

var curId = 1;

/**
 * Connector that manager low level connection and protocol bewteen server and client.
 * Develper can provide their own connector to switch the low level prototol, such as tcp or probuf.
 */
var Connector = function (port, host, opts) {
  if (!(this instanceof Connector)) {
    return new Connector(port, host, opts);
  }

  EventEmitter.call(this);
  this.port = port;
  this.host = host;
  this.opts = opts;
};

util.inherits(Connector, EventEmitter);

module.exports = Connector;

/**
 * Start connector to listen the specified port
 */
Connector.prototype.start = function (cb) {
  var that = this;

  // create socket.io server
  this.sio = socketio(this.port, this.opts.options);

  // Redis storage
  this.sio.adapter(socketioRedis({}));

  // Authentication
  // step 1 - on connection run socketioJwt logic (it will wait 15s for an 'authenticate' event with token from client)
  this.sio.sockets.on('connection', socketioJwt.authorize({
    secret: conf.oauth.secret,
    timeout: 15000,
    additional: function (decoded, onSuccess, onError) {
      User.findByUid(decoded.id).exec(function (err, user) {
        if (err) {
          logger.error(err);
          return onError('Error while retrieving authenticating user', 'internal_error');
        }

        // is user exists
        if (!user) {
          logger.error('Unable to find authenticating user account: ' + decoded.id);
          return onError('Unable to find authenticating user account: ' + decoded.id, 'unknown_user');
        }

        // is user account valid
        var allowed = user.isAllowedToConnect();
        if (!allowed.allowed) {
          logger.error(allowed.err);
          return onError(allowed.err, 'invalid_user');
        }

        // finally user is valid
        return onSuccess();
      });
    }
  }));

  // step 2 - once token is validated the socket is considered authenticated
  this.sio.sockets.on('authenticated', function (socket) {
    // log who is authenticated
    var ip = (socket.handshake.headers['x-forwarded-for'])
      ? socket.handshake.headers['x-forwarded-for']
      : socket.conn.remoteAddress;
    logger.info('ws:authenticated', socket.decoded_token.username, ip);

    // add test event
    socket.on('ping', function (data) {
      socket.emit('pong', {});
    });

    // wrap the socket
    var pomeloSocket = new SocketioPomeloSocket(curId++, socket);
    that.emit('connection', pomeloSocket);

    pomeloSocket.on('closing', function (reason) {
      logger.debug('socket.io socket closing: ', socket.id);
      pomeloSocket.send({route: 'onKick', reason: reason});
    });
  });

  process.nextTick(cb);
};

/**
 * Stop connector
 */
Connector.prototype.stop = function (force, cb) {
  this.sio.server.close();
  process.nextTick(cb);
};

Connector.encode = Connector.prototype.encode = function (reqId, route, msg) {
  if (reqId) {
    return composeResponse(reqId, route, msg);
  } else {
    return composePush(route, msg);
  }
};

/**
 * Decode client message package.
 *
 * Package format:
 *   message id: 4bytes big-endian integer
 *   route length: 1byte
 *   route: route length bytes
 *   body: the rest bytes
 *
 * @param  {String} data socket.io package from client
 * @return {Object}      message object
 */
Connector.decode = Connector.prototype.decode = function (msg) {
  var index = 0;

  var id = parseIntField(msg, index, PKG_ID_BYTES);
  index += PKG_ID_BYTES;

  var routeLen = parseIntField(msg, index, PKG_ROUTE_LENGTH_BYTES);

  var route = msg.substr(PKG_HEAD_BYTES, routeLen);
  var body = msg.substr(PKG_HEAD_BYTES + routeLen);

  return {
    id: id,
    route: route,
    body: JSON.parse(body)
  };
};

var composeResponse = function (msgId, route, msgBody) {
  return {
    id: msgId,
    body: msgBody
  };
};

var composePush = function (route, msgBody) {
  return JSON.stringify({route: route, body: msgBody});
};

var parseIntField = function (str, offset, len) {
  var res = 0;
  for (var i = 0; i < len; i++) {
    if (i > 0) {
      res <<= 8;
    }
    res |= str.charCodeAt(offset + i) & 0xff;
  }

  return res;
};
