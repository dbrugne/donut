var debug = require('debug')('donut:server:connector');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var ST_INITED = 0;
var ST_CLOSED = 1;

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

  socket.on('message', function(msg) {
    self.emit('message', msg);
  });

  this.state = ST_INITED;

  // TODO: any other events?

  /**
   * Decorate socket (shortcut)
   */
  socket.getUser = function() {
    return this.request.user;
  };
  socket.getUserId = function() {
    return this.request.user._id.toString();
  };
  socket.getUsername = function() {
    return this.request.user.username;
  };
  socket.getAvatar = function() {
    return this.request.user._avatar();
  };
  socket.getPoster = function() {
    return this.request.user.poster;
  };
  socket.getColor = function() {
    return this.request.user.color;
  };
  socket.isAdmin = function() {
    return (this.request.user.admin === true);
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

