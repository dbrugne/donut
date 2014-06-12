var _ = require('underscore');
var User = require('./user');
var random = require('./random');
var fixtures = require('./fixtures');

module.exports = function VirtualUser(sequence) {
  this.username = 'stresser-'+sequence;
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
      var url = 'http://localhost/?virtualuserid='+virtualUser.model._id;
      var io = require('socket.io-client');
      var socket = virtualUser.socket = io.connect(url, {port:3000, 'force new connection': true});
      console.log('connect to '+url);
      socket.on('connect', function(){
        console.log('connect ok');
        socket.on('welcome', function(data){
          console.log('welcome '+data.user.username);
          client.chatUser = data.user;
          socket.emit('room:join', {name: '#General'});
        });
//        socket.on('user:message', function(data){
//          console.log(data.username+': '+data.message);
////            if (data.username != virtualUser.chatUser.username) {
////              socket.emit('user:message', {to: data.username, message: 'Hello ! asv ?'});
////            }
//        });
        socket.on('error', function(){ // @todo : not sure it exists for client
          console.log('ERROR:',arguments);
        });
        socket.on('disconnect', function(){
          console.log('disconnected');
        });
      });

      fn(virtualUser);
    });
  };

  this.join = function() {
    // choose a room in fixture and join
  };

  this.leave = function() {
    // choose a room in room list and join
  };

  this.message = function() {
    // choose a room in room list and send a message from fixture
  };
};

