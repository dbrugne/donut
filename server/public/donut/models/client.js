define([
  'underscore',
  'backbone',
  'socket.io',
  'pomelo'
], function (_, Backbone, io, pomelo) {
  var ClientModel = Backbone.Model.extend({

    connector: '', // the current connector URL on which this client is connected

    initialize: function() {
      localStorage.debug = ''; // @debug ('*')
      this._events();
    },

    _events: function() {
      var that = this;

      // SOCKET.IO EVENTS
      // ======================================================
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

      // GLOBAL EVENTS
      // ======================================================
      pomelo.on('search', function(data) {
        that.debug(['io:in:search', data]);
        that.trigger('search', data);
      });

      // ROOM EVENTS
      // ======================================================

      pomelo.on('room:join', function(data) {
        that.debug(['io:in:room:join', data]);
        that.trigger('room:join', data);
      });
      pomelo.on('room:leave', function(data) {
        that.debug(['io:in:room:leave', data]);
        that.trigger('room:leave', data);
      });
      pomelo.on('room:topic', function(data) {
        that.debug(['io:in:room:topic', data]);
        that.trigger('room:topic', data);
      });
      pomelo.on('room:in', function(data) {
        that.debug(['io:in:room:in', data]);
        that.trigger('room:in', data);
      });
      pomelo.on('room:out', function(data) {
        that.debug(['io:in:room:out', data]);
        that.trigger('room:out', data);
      });
      pomelo.on('room:message', function(data) {
        that.debug(['io:in:room:message', data]);
        that.trigger('room:message', data);
      });
      pomelo.on('room:read', function(data) {
        that.debug(['io:in:room:read', data]);
        that.trigger('room:read', data);
      });
      pomelo.on('room:update', function(data) {
        that.debug(['io:in:room:update', data]);
        that.trigger('room:update', data);
      });
      pomelo.on('room:updated', function(data) {
        that.debug(['io:in:room:updated', data]);
        that.trigger('room:updated', data);
      });
      pomelo.on('room:delete', function(data) {
        that.debug(['io:in:room:delete', data]);
        that.trigger('room:delete', data);
      });
      pomelo.on('room:history', function(data) {
        that.debug(['io:in:room:history', data]);
        that.trigger('room:history', data);
      });
      pomelo.on('room:op', function(data) {
        that.debug(['io:in:room:op', data]);
        that.trigger('room:op', data);
      });
      pomelo.on('room:deop', function(data) {
        that.debug(['io:in:room:deop', data]);
        that.trigger('room:deop', data);
      });
      pomelo.on('room:kick', function(data) {
        that.debug(['io:in:room:kick', data]);
        that.trigger('room:kick', data);
      });

      // USER EVENTS
      // ======================================================

      pomelo.on('user:leave', function(data) {
        that.debug(['io:in:user:leave', data]);
        that.trigger('user:leave', data);
      });
      pomelo.on('user:welcome', function(data) {
        that.debug(['io:in:user:welcome', data]);
        that.trigger('user:welcome', data);
      });
      pomelo.on('user:online', function(data) {
        that.debug(['io:in:user:online', data]);
        that.trigger('user:online', data);
      });
      pomelo.on('user:offline', function(data) {
        that.debug(['io:in:user:offline', data]);
        that.trigger('user:offline', data);
      });
      pomelo.on('user:message', function(data) {
        that.debug(['io:in:user:message', data]);
        that.trigger('user:message', data);
      });
      pomelo.on('user:profile', function(data) {
        that.debug(['io:in:user:profile', data]);
        that.trigger('user:profile', data);
      });
      pomelo.on('user:read', function(data) {
        that.debug(['io:in:user:read', data]);
        that.trigger('user:read', data);
      });
      pomelo.on('user:update', function(data) {
        that.debug(['io:in:user:update', data]);
        that.trigger('user:update', data);
      });
      pomelo.on('user:updated', function(data) {
        that.debug(['io:in:user:updated', data]);
        that.trigger('user:updated', data);
      });
      pomelo.on('user:status', function(data) {
        that.debug(['io:in:user:status', data]);
        that.trigger('user:status', data);
      });
      pomelo.on('user:history', function(data) {
        that.debug(['io:in:user:history', data]);
        that.trigger('user:history', data);
      });

    },

    debug: function(message) {
      console.log(message); // @debug
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
    connect: function(port) {
      var that = this;

      if (pomelo.isConnected())
        this.disconnect();

      if (port) {
        return this._connect({
          host: window.location.hostname,
          port: port
        });
      }

      pomelo.init({
          host: window.location.hostname,
          port: 3014, // @todo : remove port (should be naturally 80 on production)
          log : true
        },
        function () {
          that.debug('pomelo:init done');
          pomelo.request(
            'gate.gateHandler.queryEntry',
            {},
            function (data) {
              that.debug('pomelo:gate dispatched to: ' + data.host + ':' + data.port);
              pomelo.disconnect();
              if (data.code === 500)
                return that.debug("There is no server to log in, please wait.");
              that._connect(data);
            }
          );
        }
      );
    },
    _connect: function(server) {
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

    disconnect: function() {
      pomelo.disconnect();
    },

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

    // GLOBAL METHODS
    // ======================================================

    home: function() {
      var that = this;
      this.debug(['io:out:home', {}]);
      pomelo.request(
        'chat.homeHandler.home',
        {},
        function(data) {
            that.debug(['io:in:home', data]);
            if (!data.err)
              that.trigger('home', data);
          }
      );
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

    roomJoin: function(name, fn) {
      var data = {name: name};
      this.debug(['io:out:room:join', data]);
      var that = this;
      pomelo.request(
        'chat.roomJoinHandler.join',
        data,
        function(data) {
          if (data.err)
            that.debug(['io:out:room:join error: ', data]);
          return fn(data);
        }
      );
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
      pomelo.notify('chat.roomMessageHandler.message', data);
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