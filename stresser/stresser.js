//var io = require('socket.io-client');
var random = require('./random');
var mongoose = require('mongoose');

// MONGO
//mongoose.set('debug', true);
mongoose.connect('mongodb://localhost:27017/chat');
mongoose.connection.on('error', function() {
  console.log('mongodb error');
  console.log(arguments);
});
mongoose.connection.once('open', function() {
  console.log('mongodb opened');

  for (var i=0; i <= 2500; i++) {
    setTimeout(function() {
      newClient();
    }, random.number(4));
  };

});

// SCHEMA
var userSchema = mongoose.Schema({
  username       : String,
  name           : String,
  roles          : [String],
  bio            : String,
  location       : String,
  website        : String,
  avatar         : String,
  color          : String,
  local            : {
    email      : String,
    password   : String
  },
  facebook         : {
    id         : String,
    token      : String,
    email      : String,
    name       : String
  },
  rooms            : [{ type: String, ref: 'Room' }],
  onetoones        : [{ type: mongoose.Schema.ObjectId, ref: 'User' }]
});
User = mongoose.model('User', userSchema);

// MODEL
function newClient() {
  var client = {
    socket: '',
    dbUser: '',
    ioUser: '',
    init: function() {
      this.dbUser = new User({
        username: random.string(10),
        local: {
          email: random.email(),
          password: random.string(25)
        }
      });
//      console.log(['about to save', this.dbUser]);
      var that = this;
      this.dbUser.save(function (err, user) {
        if (err) return console.error(err);
        this.dbUser = user;
        console.log('User created ' +this.dbUser._id);

        var url = 'http://localhost/?virtualuserid='+this.dbUser._id;
        var io = require('socket.io-client');
        var socket = this.socket = io.connect(url, {port:3000, 'force new connection': true});
        var client = this;
        socket.on('connect', function(){
          console.log('connect ok');
          socket.on('welcome', function(data){
//            console.log(data);
            console.log('welcome '+data.user.username);
            client.ioUser = data.user;
            socket.emit('room:join', {name: '#General'});
          });
          socket.on('user:message', function(data){
            console.log(data.username+': '+data.message);
//            if (data.username != that.ioUser.username) {
//              socket.emit('user:message', {to: data.username, message: 'Hello ! asv ?'});
//            }
          });
          socket.on('disconnect', function(){
            console.log('disconnected');
          });
        });
      });
    }
  };
  client.init();
  return client;
};
