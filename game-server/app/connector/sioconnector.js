var logger = require('pomelo-logger').getLogger('donut', __filename);
var conf = require('../../../shared/config/index');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var socketio = require('socket.io');
var socketioSocket = require('./siosocket');
var socketioRedis = require('socket.io-redis');
var socketioPassport = require('passport.socketio');
var redisStore = require('../../../shared/authentication/redisStore');
var cookieParser = require('cookie-parser');
var passport = require('../../../shared/authentication/passport');

var PKG_ID_BYTES = 4;
var PKG_ROUTE_LENGTH_BYTES = 1;
var PKG_HEAD_BYTES = PKG_ID_BYTES + PKG_ROUTE_LENGTH_BYTES;

var curId = 1;

/**
 * Connector that manager low level connection and protocol bewteen server and client.
 * Develper can provide their own connector to switch the low level prototol, such as tcp or probuf.
 */
var Connector = function(port, host, opts) {
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
Connector.prototype.start = function(cb) {
  var self = this;

  // create socket.io server
  this.wsocket = socketio(this.port, this.opts.options);

  // Redis storage
  this.wsocket.adapter(socketioRedis({}));

  // Authentication
  /**
   * @todo : passe ici deux fois ! Une fois connexion gate et une fois connexion connector
   */
  this.wsocket.use(socketioPassport.authorize({
    passport      : passport,
    cookieParser  : cookieParser,
    key           : conf.sessions.key,
    secret        : conf.sessions.secret,
    store         : redisStore,
    success: function (data, accept){
      logger.info('socketioPassport::success');
      accept();
    },
    fail: function (data, message, critical, accept) {
      logger.info('socketioPassport::fail');
      accept(new Error(message));
    }
  }));

  this.wsocket.sockets.on('connection', function (socket) {

    logger.debug('new socket.io connection: ', socket.id);

    // Wrap the socket
    var siosocket = new socketioSocket(curId++, socket);

    self.emit('connection', siosocket);
    siosocket.on('closing', function(reason) {
      logger.debug('socket.io socket closing: ', socket.id);
      siosocket.send({route: 'onKick', reason: reason});
    });
  });

  process.nextTick(cb);
};

/**
 * Stop connector
 */
Connector.prototype.stop = function(force, cb) {
  this.wsocket.server.close();
  process.nextTick(cb);
};

Connector.encode = Connector.prototype.encode = function(reqId, route, msg) {
  if(reqId) {
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
Connector.decode = Connector.prototype.decode = function(msg) {
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

var composeResponse = function(msgId, route, msgBody) {
  return {
    id: msgId,
    body: msgBody
  };
};

var composePush = function(route, msgBody) {
  return JSON.stringify({route: route, body: msgBody});
};

var parseIntField = function(str, offset, len) {
  var res = 0;
  for(var i=0; i<len; i++) {
    if(i > 0) {
      res <<= 8;
    }
    res |= str.charCodeAt(offset + i) & 0xff;
  }

  return res;
};