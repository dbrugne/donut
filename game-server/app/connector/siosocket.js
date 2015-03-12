var logger = require('../../pomelo-logger').getLogger('donut', __filename);
var _ = require('underscore');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var ST_INITED = 0;
var ST_CLOSED = 1;

// message/socket limiter
var LIMITER_MAX      = 15;
var LIMITER_PERIOD   = 5000;
var LIMITER_BLOCKFOR = 10000;

/**
 * Socket class that wraps socket.io socket to provide unified interface for up level.
 */
var Socket = function(id, socket) {
  EventEmitter.call(this);
  this.id = id;
  this.socket = socket;
  this.remoteAddress = {
    ip: socket.handshake.address.address,
    port: socket.handshake.address.port
  };

  var self = this;

  socket.on('disconnect', this.emit.bind(this, 'disconnect'));

  socket.on('error', this.emit.bind(this, 'error'));

  this.__limiter__ = [];
  this.__limiter_blocked__ = false;
  socket.on('message', function(msg) {
    self.limiterCleanup();
    self.limiterAdd();

    // already blocked socket
    if (self.__limiter_blocked__ !== false) {
      if (self.__limiter__.length > LIMITER_MAX) {
        self.__limiter_blocked__ = (Date.now() + LIMITER_BLOCKFOR);
        return logger.warn('[limiter] Socket blocked but message per time rate is still over limit, blocking prolongation '+LIMITER_BLOCKFOR+'ms');
      }
      return logger.warn('[limiter] Socket is blocked');
    }

    // socket is now over the limit
    if (self.__limiter__.length > LIMITER_MAX) {
      self.__limiter_blocked__ = (Date.now() + LIMITER_BLOCKFOR);
      return logger.warn('[limiter] Max message per time, socket blocked for '+LIMITER_BLOCKFOR+'ms');
    }

    self.emit('message', msg);
  });

  this.state = ST_INITED;

  /**
   * Add shortcut to retrieve socket uid before pomelo session bind (used in entryHendler)
   */
  socket.getUserId = function() {
    return this.request.user._id.toString();
  };
};

util.inherits(Socket, EventEmitter);

module.exports = Socket;

Socket.prototype.send = function(msg) {
  if(this.state !== ST_INITED) {
    return;
  }
  if(typeof msg !== 'string') {
    msg = JSON.stringify(msg);
  }
  this.socket.send(msg);
};

Socket.prototype.disconnect = function() {
  if(this.state === ST_CLOSED) {
    return;
  }

  this.state = ST_CLOSED;
  this.socket.disconnect();
};

Socket.prototype.sendBatch = function(msgs) {
  this.send(encodeBatch(msgs));
};

/**
 * Encode batch msg to client
 */
var encodeBatch = function(msgs){
  var res = '[', msg;
  for(var i=0, l=msgs.length; i<l; i++) {
    if(i > 0) {
      res += ',';
    }
    msg = msgs[i];
    if(typeof msg === 'string') {
      res += msg;
    } else {
      res += JSON.stringify(msg);
    }
  }
  res += ']';
  return res;
};

/**
 * MESSAGE PER SOCKET LIMITER
 */
Socket.prototype.limiterAdd = function() {
  this.__limiter__.push(Date.now())
};
Socket.prototype.limiterCleanup = function() {
  // cleanup blocked status
  if (this.__limiter_blocked__ !== false && this.__limiter_blocked__ < Date.now()) {
    this.__limiter_blocked__ = false;
  }

  // cleanup expired messages
  var period = (Date.now()) - LIMITER_PERIOD;
  this.__limiter__ = _.reject(this.__limiter__, function(m) {
    if (m <= period) {
      return true;
    }
  });
  this.__limiter__ = _.last(this.__limiter__, LIMITER_MAX * 2); // avoid memory leak
};

