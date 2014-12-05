define([
  'underscore',
  'backbone',
  'socket.io',
  'pomelo'
], function (_, Backbone, io, pomelo) {
  var ClientModel = Backbone.Model.extend({

    connector: '', // the current connector URL on which this client is connected

    clientId: '', // an identifier given by server on first connection that uniquely identify this client/DOM

    initialize: function() {
      localStorage.debug = ''; // @debug ('*')

      var that = this;

      pomelo.on('room:message', function(data) {
        console.log('message reçu:');
        console.log(data);
      });

      pomelo.on('socketIoEvent', function(data) {
        if (!data)
          return;
        if (data.debug)
          that.debug(data.debug);
        if (data.event)
          that.trigger(data.event);

        if (data.event == 'disconnected')
          that.connector = '';

        // @todo : repair !!!!
        //if (err == 'notlogged')
        //  that.trigger('notlogged');
        //else
        //  that.trigger('error');
      });
    },

    debug: function(message) {
      console.log(message); // @debug
    },

    // @source: http://slavik.meltser.info/the-efficient-way-to-create-guid-uuid-in-javascript-with-explanation/
    guid: function() {
      function _p8(s) {
        var p = (Math.random().toString(16)+"000000000").substr(2,8);
        return s ? "-" + p.substr(0,4) + "-" + p.substr(4,4) : p ;
      }
      return _p8() + _p8(true) + _p8(true) + _p8();
    },

    disconnect: function() {
      pomelo.disconnect();
    },

    reconnect: function() {
      this.disconnect();
      this.connect();
    },

    /**
     * .connect() should be done at the end of App initialization to allow
     * interface binding to work
     *
     * First init pomelo, it open a socket with "gate" server.
     * Send a "gate.gateHandler.queryEntry" request to get "connector" to connect to.
     * Disconnect socket.
     * Reinit pomelo to be connect to given "connector" server.
     * Receive welcome message on success.
     */
    connect: function() {
      var that = this;

      pomelo.init({
          host: window.location.hostname,
          port: 3014, // @todo : remove port (should be naturally 80 on production)
          log : true
        },
        function () {
          that.debug('pomelo:init done');
          that._askForConnector();
        }
      );
    },
    _askForConnector: function() {
      var that = this;
      pomelo.request('gate.gateHandler.queryEntry', {
        },
        function (data) {
        that.debug('pomelo:gate dispatched to: ' + data.host + ':' + data.port);
        pomelo.disconnect();
        if (data.code === 500)
          return that.debug("There is no server to log in, please wait.");
        that._helloConnector(data);
      });
    },
    _helloConnector: function(server) {
      var that = this;
      pomelo.init({
        host: server.host,
        port: server.port,
        log : true
      }, function () {
        pomelo.request('connector.entryHandler.enter', {
        }, function (data) {
          if (data.error)
            return that.debug(["connector.entryHandler.enter returns error", data]);

          that.connector = 'ws://'+server.host+':'+server.port;
          that.debug("connected to "+that.connector);

          that.debug(['io:in:welcome', data]);
          that.trigger('welcome', data);
        });
      });
    },
    directConnect: function(port) {
      this.disconnect();
      return this._helloConnector({
        host: window.location.hostname,
        port: port
      });
    },

    //pomMessage: function() {
    //  pomelo.request("chat.chatHandler.send", {
    //    rid: '#donut',
    //    content: "Vas-y José, fait chauffer l'orchestre",
    //    from: 'damien',
    //    target: '*'
    //  }, function(data) {
    //    console.log('message envoyé');
    //    console.log(data);
    //  });
    //},
    status: function(uid) {
      pomelo.request('chat.statusHandler.status', {
        uid: uid
      }, function(data) {
        console.log('status: ', data);
      });
    },
    statusMulti: function(uids) {
      pomelo.request('chat.statusHandler.statusMulti', {
        uids: uids
      }, function(data) {
        console.log('statusMulti: ', data);
      });
    },
    sessions: function() {
      pomelo.request('connector.sessionsHandler.list', {}, function(data) {
        console.log('sessions: ', data);
      });
    },

    ____connect: function() {

      // GLOBAL EVENTS
      // ======================================================
      this.socket.on('welcome', function (data) {
        that.debug(['io:in:welcome', data]);
        that.trigger('welcome', data);
      });
      this.socket.on('home', function (data) {
        that.debug(['io:in:home', data]);
        that.trigger('home', data);
      });
      this.socket.on('search', function(data) {
        that.debug(['io:in:search', data]);
        that.trigger('search', data);
      });

      // ROOM EVENTS
      // ======================================================

      this.socket.on('room:leave', function(data) {
        that.debug(['io:in:room:leave', data]);
        that.trigger('room:leave', data);
      });
      this.socket.on('room:welcome', function(data) {
        that.debug(['io:in:room:welcome', data]);
        that.trigger('room:welcome', data);
      });
      this.socket.on('room:topic', function(data) {
        that.debug(['io:in:room:topic', data]);
        that.trigger('room:topic', data);
      });
      this.socket.on('room:in', function(data) {
        that.debug(['io:in:room:in', data]);
        that.trigger('room:in', data);
      });
      this.socket.on('room:out', function(data) {
        that.debug(['io:in:room:out', data]);
        that.trigger('room:out', data);
      });
      this.socket.on('room:message', function(data) {
        that.debug(['io:in:room:message', data]);
        that.trigger('room:message', data);
      });
      this.socket.on('room:read', function(data) {
        that.debug(['io:in:room:read', data]);
        that.trigger('room:read', data);
      });
      this.socket.on('room:update', function(data) {
        that.debug(['io:in:room:update', data]);
        that.trigger('room:update', data);
      });
      this.socket.on('room:updated', function(data) {
        that.debug(['io:in:room:updated', data]);
        that.trigger('room:updated', data);
      });
      this.socket.on('room:delete', function(data) {
        that.debug(['io:in:room:delete', data]);
        that.trigger('room:delete', data);
      });
      this.socket.on('room:history', function(data) {
        that.debug(['io:in:room:history', data]);
        that.trigger('room:history', data);
      });
      this.socket.on('room:op', function(data) {
        that.debug(['io:in:room:op', data]);
        that.trigger('room:op', data);
      });
      this.socket.on('room:deop', function(data) {
        that.debug(['io:in:room:deop', data]);
        that.trigger('room:deop', data);
      });
      this.socket.on('room:kick', function(data) {
        that.debug(['io:in:room:kick', data]);
        that.trigger('room:kick', data);
      });

      // USER EVENTS
      // ======================================================

      this.socket.on('user:leave', function(data) {
        that.debug(['io:in:user:leave', data]);
        that.trigger('user:leave', data);
      });
      this.socket.on('user:welcome', function(data) {
        that.debug(['io:in:user:welcome', data]);
        that.trigger('user:welcome', data);
      });
      this.socket.on('user:online', function(data) {
        that.debug(['io:in:user:online', data]);
        that.trigger('user:online', data);
      });
      this.socket.on('user:offline', function(data) {
        that.debug(['io:in:user:offline', data]);
        that.trigger('user:offline', data);
      });
      this.socket.on('user:message', function(data) {
        that.debug(['io:in:user:message', data]);
        that.trigger('user:message', data);
      });
      this.socket.on('user:profile', function(data) {
        that.debug(['io:in:user:profile', data]);
        that.trigger('user:profile', data);
      });
      this.socket.on('user:read', function(data) {
        that.debug(['io:in:user:read', data]);
        that.trigger('user:read', data);
      });
      this.socket.on('user:update', function(data) {
        that.debug(['io:in:user:update', data]);
        that.trigger('user:update', data);
      });
      this.socket.on('user:updated', function(data) {
        that.debug(['io:in:user:updated', data]);
        that.trigger('user:updated', data);
      });
      this.socket.on('user:status', function(data) {
        that.debug(['io:in:user:status', data]);
        that.trigger('user:status', data);
      });
      this.socket.on('user:history', function(data) {
        that.debug(['io:in:user:history', data]);
        that.trigger('user:history', data);
      });
    },

    // GLOBAL METHODS
    // ======================================================

    home: function() {
      //this.socket.emit('home', {});
      this.debug(['io:out:home', {}]);
    },
    search: function(search, searchKey, rooms, users, light) {
      var data = {
        search: search, // string to search for
        key: searchKey, // string key that server will send in response (allow RPC-like request)
        light: (light)  // if the search should return a light version of results or not
          ? true
          : false,
        rooms: (rooms) // if we should search for rooms
          ? true
          : false,
        users: (users) // if we should search for users
          ? true
          : false
      };
      //this.socket.emit('search', data);
      this.debug(['io:out:search', data]);
    },

    // ROOM METHODS
    // ======================================================

    join: function(name) {
      var data = {name: name};
      //this.socket.emit('room:join', data);
      this.debug(['io:out:room:join', data]);
    },
    leave: function(name) {
      var data = {name: name};
      //this.socket.emit('room:leave', data);
      this.debug(['io:out:room:leave', data]);
    },
    topic: function(name, topic) {
      var data = {name: name, topic: topic};
      //this.socket.emit('room:topic', data);
      this.debug(['io:out:room:topic', data]);
    },
    roomMessage: function(name, message) {
      var data = {name: name, message: message};
      //this.socket.emit('room:message', data);
      pomelo.request(
        'chat.roomMessageHandler.send',
        data,
        function(data) {  console.log('room:message:response', data); }
      );
      this.debug(['io:out:room:message', data]);
    },
    roomRead: function(name) {
      var data = {name: name};
      //this.socket.emit('room:read', data);
      this.debug(['io:out:room:read', data]);
    },
    roomUpdate: function(name, fields) {
      var data = {name: name, data: fields};
      //this.socket.emit('room:update', data);
      this.debug(['io:out:room:update', data]);
    },
    roomDelete: function(name) {
      var data = {name: name};
      //this.socket.emit('room:delete', data);
      this.debug(['io:out:room:delete', data]);
    },
    roomHistory: function(name, since, until) {
      var data = {name: name, since: since, until: until};
      //this.socket.emit('room:history', data);
      this.debug(['io:out:room:history', data]);
    },
    roomOp: function(name, username) {
      var data = {name: name, username: username};
      //this.socket.emit('room:op', data);
      this.debug(['io:out:room:op', data]);
    },
    roomDeop: function(name, username) {
      var data = {name: name, username: username};
      //this.socket.emit('room:deop', data);
      this.debug(['io:out:room:deop', data]);
    },
    roomKick: function(name, username, reason) {
      var data = {name: name, username: username};
      if (reason)
        data.reason = reason;
      //this.socket.emit('room:kick', data);
      this.debug(['io:out:room:kick', data]);
    },

    // USER METHODS
    // ======================================================

    userJoin: function(username) {
      var data = {username: username};
      //this.socket.emit('user:join', data);
      this.debug(['io:out:user:join', data]);
    },
    userLeave: function(username) {
      var data = {username: username};
      //this.socket.emit('user:leave', data);
      this.debug(['io:out:user:leave', data]);
    },
    userMessage: function(username, message) {
      var data = {username: username, message: message};
      //this.socket.emit('user:message', data);
      this.debug(['io:out:user:message', data]);
    },
    userProfile: function(username) {
      var data = {username: username};
      //this.socket.emit('user:profile', data);
      this.debug(['io:out:user:profile', data]);
    },
    userRead: function() {
      //this.socket.emit('user:read', {});
      this.debug(['io:out:user:read', {}]);
    },
    userUpdate: function(fields) {
      var data = {data: fields};
      //this.socket.emit('user:update', data);
      this.debug(['io:out:user:update', data]);
    },
    userStatus: function(username) {
      var data = {username: username};
      //this.socket.emit('user:status', data);
      this.debug(['io:out:user:status', data]);
    },
    userHistory: function(username, since, until) {
      var data = {username: username, since: since, until: until};
      //this.socket.emit('user:history', data);
      this.debug(['io:out:user:history', data]);
    }

  });

  return new ClientModel();
});