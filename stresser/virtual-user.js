var _ = require('underscore');
var User = require('./user');
var random = require('./random');
var fixtures = require('./fixtures');
//var io = require('socket.io-client');

module.exports = function VirtualUser(configuration) {
  this.username = 'stresser-'+configuration.currentSequence;
  this.model = undefined;
  this.socket = undefined;
  this.chatUser = undefined;
  this.rooms = [];

  this.init = function(fn) {
    // Find or create a database user for this ID
    var virtualUser = this;
    User.findOrCreate(this.username, function(user) {

      virtualUser.model = user;

      // now socket it!
      virtualUser.connect(fn);
    });
  };

  // @doc: https://github.com/Automattic/socket.io-client#nodejs-server-side-usage
  // @doc: https://github.com/Automattic/engine.io-client#methods
  this.connect = function(fn) {
    var virtualUser = this;

    if (virtualUser.socket && virtualUser.socket.connected)
      return;

    var url = 'ws://localhost:3000/?virtualuserid='+virtualUser.model._id;
    var socket = virtualUser.socket = require('socket.io-client')(url, {
      multiplex: false,
      timeout: 2000, // connection timeout before a connect_error and connect_timeout events are emitted (20000)
      transports: ['websocket']
    });

    console.log('try to connect '+virtualUser.username+' to '+url);

    socket.on('connect', function(){
      console.log(virtualUser.username+' connected !');
      socket.on('welcome', function(data){
        console.log('welcome '+data.user.username);
        virtualUser.chatUser = data.user;
        socket.emit('room:join', {name: '#General'});
      });
      socket.on('connect_error', function(err) { console.log('connect_error for '+virtualUser.chatUser.username+' socket (error: '+err+')'); });
      socket.on('connect_timeout', function() { console.log('connect_timeout for '+virtualUser.chatUser.username+' socket'); });
      socket.on('reconnect', function(num) { console.log('reconnect for '+virtualUser.chatUser.username+' socket (attempt '+num+')'); });
      socket.on('reconnect_attempt', function() { console.log('reconnect_attempt for '+virtualUser.chatUser.username+' socket'); });
      socket.on('reconnecting', function(num) { console.log('reconnecting for '+virtualUser.chatUser.username+' socket (attempt '+num+')'); });
      socket.on('reconnect_error', function(err) { console.log('reconnect_error for '+virtualUser.chatUser.username+' socket (error: '+err+')'); });
      socket.on('reconnect_failed', function() { console.log('reconnect_failed for '+virtualUser.chatUser.username+' socket'); });

      socket.on('room:message', function(data){
        if (data.message == '/pause' && !configuration.pause) {
          console.log('stresser paused');
          socket.emit('room:message', {name: data.name, message: 'stresser paused'});
          configuration.pause = true;
          return;
        }
        if (data.message == '/play' && configuration.pause) {
          console.log('stresser unpaused');
          socket.emit('room:message', {name: data.name, message: 'stresser unpaused'});
          configuration.pause = false;
          return;
        }

        if (data.username.indexOf('stresser-') === -1 && random.probability(12)) {
          socket.emit('room:message', {name: data.name, message: 'ah ah'});
        }
      });

      if (fn) fn(virtualUser);
    });
  };

  this.disconnect = function() {
    if (!this.socket.connected)
      return;

    this.socket.disconnect();
  };

  this.reconnect = function() {
    this.connect();
  };

  this.message = function() {
    if (!this.socket.connected)
      return;

    this.sendRoomMessage();
    // maybe send other messages
    for (var i = 15 ; i > 0 ; i = i - 5) {
      if (random.probability(10)) {
        this.sendRoomMessage();
      }
    }
  };
  this.sendRoomMessage = function() {
    var m = _.sample(fixtures.messages);
    this.socket.emit('room:message', {name: '#General', message: m});
  };

};

