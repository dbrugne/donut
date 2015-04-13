define([
  'underscore',
  'backbone',
  'libs/donut-debug',
  'socket.io',
  'pomelo'
], function (_, Backbone, donutDebug, io, pomelo) {

  var debug = donutDebug('donut:client');

  var client = _.extend({

    initialize: function() {

      // connection events
      pomelo.on('connect',            function() { debug('connect'); this.trigger('connect'); }, this);
      pomelo.on('disconnect',         function(reason) { debug('disconnect', reason); this.trigger('disconnect', reason); }, this);
      pomelo.on('error',              function(err) { debug('error', err); this.trigger('error', err); }, this);

      // reconnection events
      pomelo.on('reconnect',          function(num) { debug('reconnect', num); this.trigger('reconnect', num); }, this);
      pomelo.on('reconnect_attempt',  function() { debug('reconnect_attempt'); this.trigger('reconnect_attempt'); }, this);
      pomelo.on('reconnecting',       function(num) { debug('reconnecting', num); this.trigger('reconnecting', num); }, this);
      pomelo.on('reconnect_error',    function(err) { debug('reconnect_error', err); this.trigger('reconnect_error', err); }, this);
      pomelo.on('reconnect_failed',   function() { debug('reconnect_failed'); this.trigger('reconnect_failed'); }, this);

      pomelo.on('welcome', function(data) {
        debug('io:in:welcome', data);
        this.trigger('welcome', data);
      }, this);
      pomelo.on('room:join', function(data) {
        debug('io:in:room:join', data);
        this.trigger('room:join', data);
      }, this);
      pomelo.on('room:leave', function(data) {
        debug('io:in:room:leave', data);
        this.trigger('room:leave', data);
      }, this);
      pomelo.on('room:message', function(data) {
        debug('io:in:room:message', data);
        this.trigger('room:message', data);
      }, this);
      pomelo.on('room:topic', function(data) {
        debug('io:in:room:topic', data);
        this.trigger('room:topic', data);
      }, this);
      pomelo.on('room:in', function(data) {
        debug('io:in:room:in', data);
        this.trigger('room:in', data);
      }, this);
      pomelo.on('room:out', function(data) {
        debug('io:in:room:out', data);
        this.trigger('room:out', data);
      }, this);
      pomelo.on('room:updated', function(data) {
        debug('io:in:room:updated', data);
        this.trigger('room:updated', data);
      }, this);
      pomelo.on('room:op', function(data) {
        debug('io:in:room:op', data);
        this.trigger('room:op', data);
      }, this);
      pomelo.on('room:deop', function(data) {
        debug('io:in:room:deop', data);
        this.trigger('room:deop', data);
      }, this);
      pomelo.on('room:kick', function(data) {
        debug('io:in:room:kick', data);
        this.trigger('room:kick', data);
      }, this);
      pomelo.on('room:ban', function(data) {
        debug('io:in:room:ban', data);
        this.trigger('room:ban', data);
      }, this);
      pomelo.on('room:deban', function(data) {
        debug('io:in:room:deban', data);
        this.trigger('room:deban', data);
      }, this);
      pomelo.on('room:viewed', function(data) {
        debug('io:in:room:viewed', data);
        this.trigger('room:viewed', data);
      }, this);
      pomelo.on('user:join', function(data) {
        debug('io:in:user:join', data);
        this.trigger('user:join', data);
      }, this);
      pomelo.on('user:leave', function(data) {
        debug('io:in:user:leave', data);
        this.trigger('user:leave', data);
      }, this);
      pomelo.on('user:message', function(data) {
        debug('io:in:user:message', data);
        this.trigger('user:message', data);
      }, this);
      pomelo.on('user:online', function(data) {
        debug('io:in:user:online', data);
        this.trigger('user:online', data);
      }, this);
      pomelo.on('user:offline', function(data) {
        debug('io:in:user:offline', data);
        this.trigger('user:offline', data);
      }, this);
      pomelo.on('user:updated', function(data) {
        debug('io:in:user:updated', data);
        this.trigger('user:updated', data);
      }, this);
      pomelo.on('user:preferences', function(data) {
        debug('io:in:user:preferences', data);
        this.trigger('user:preferences', data);
      }, this);
      pomelo.on('user:viewed', function(data) {
        debug('io:in:user:viewed', data);
        this.trigger('user:viewed', data);
      }, this);
    },

    /**
     * Should be done at the end of App initialization to allow interface binding to work
     *
     * @param host could be use to force connection on given host
     * @param port could be use to force connection on given port
     */
    connect: function(host, port) {
      this.trigger('connecting');
      pomelo.connect(host, port);
    },
    disconnect: function() {
      pomelo.disconnect();
    },
    isConnected: function() {
      return pomelo.isConnected();
    },

    // DEBUG METHODS
    // ======================================================

    status: function(uid) {
      pomelo.request('chat.adminHandler.status', {
        uid: uid
      }, function(data) {
        debug('status: ', data);
      });
    },
    statusMulti: function(uids) {
      pomelo.request('chat.adminHandler.statusMulti', {
        uids: uids
      }, function(data) {
        debug('statusMulti: ', data);
      });
    },

    // GLOBAL METHODS
    // ======================================================

    home: function() {
      var that = this;
      debug('io:out:home', {});
      pomelo.request(
          'chat.homeHandler.home',
          {},
          function(response) {
            if (response.err)
              return debug('io:in:home error: ', response);

            debug('io:in:home', response);
            that.trigger('home', response);
          }
      );
    },
    search: function(search, searchKey, rooms, users, light) {
      var that = this;
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
      debug('io:out:search', data);
      pomelo.request(
          'chat.searchHandler.search',
          data,
          function(response) {
            if (response.err)
              return debug('io:in:search error: ', response);

            debug('io:in:search', response);
            that.trigger('search', response);
          }
      );
    },

    // ROOM METHODS
    // ======================================================

    roomJoin: function(name, callback) {
      var data = {name: name};
      debug('io:out:room:join', data);
      pomelo.request(
          'chat.roomJoinHandler.join',
          data,
          function(response) {
            debug('io:in:room:join', response);
            if (_.isFunction(callback))
              return callback(response);
          }
      );
    },
    roomLeave: function(name) {
      var data = {name: name};
      pomelo.notify('chat.roomLeaveHandler.leave', data);
      debug('io:out:room:leave', data);
    },
    roomMessage: function(name, message, images) {
      var data = {name: name, message: message, images: images};
      pomelo.notify('chat.roomMessageHandler.message', data);
      debug('io:out:room:message', data);
    },
    roomTopic: function(name, topic) {
      var data = {name: name, topic: topic};
      debug('io:out:room:topic', data);
      var that = this;
      pomelo.request(
          'chat.roomTopicHandler.topic',
          data,
          function(response) {
            if (response.err)
              return debug('io:in:room:topic error: ', response);
          }
      );
    },
    roomRead: function(name, fn) {
      var data = {name: name};
      debug('io:out:room:read', data);
      var that = this;
      pomelo.request(
          'chat.roomReadHandler.read',
          data,
          function(response) {
            if (response.err)
              return debug('io:in:room:read error: ', response);

            debug('io:in:room:read', response);
            return fn(response);
          }
      );
    },
    roomUsers: function(name, fn) {
      var data = {name: name};
      debug('io:out:room:users', data);
      var that = this;
      pomelo.request(
          'chat.roomUsersHandler.users',
          data,
          function(response) {
            if (response.err)
              return debug('io:in:room:users error: ', response);

            debug('io:in:room:users', response);
            return fn(response);
          }
      );
    },
    roomUpdate: function(name, fields, fn) {
      var data = {name: name, data: fields};
      debug('io:out:room:update', data);
      var that = this;
      pomelo.request(
          'chat.roomUpdateHandler.update',
          data,
          function(response) {
            debug('io:in:room:update', response);
            return fn(response);
          }
      );
    },
    roomCreate: function(name, callback) {
      var data = {name: name};
      debug('io:out:room:create', data);
      pomelo.request(
          'chat.roomCreateHandler.create',
          data,
          function(response) {
            debug('io:in:room:create', response);
            if (_.isFunction(callback))
              return callback(response);
          }
      );
    },
    roomDelete: function(name) {
      var data = {name: name};
      debug('io:out:room:delete', data);
      var that = this;
      pomelo.request(
          'chat.roomDeleteHandler.delete',
          data,
          function(response) {
            if (response.err)
              return debug('io:in:room:delete error: ', response);
          }
      );
    },
    roomHistory: function(name, since, fn) {
      var data = {name: name, since: since};
      debug('io:out:room:history', data);
      var that = this;
      pomelo.request(
          'chat.roomHistoryHandler.history',
          data,
          function(response) {
            if (response.err)
              return debug('io:in:room:history error: ', response);

            debug('io:in:room:history', response);
            return fn(response);
          }
      );
    },
    roomOp: function(name, username) {
      var data = {name: name, username: username};
      debug('io:out:room:op', data);
      var that = this;
      pomelo.request(
          'chat.roomOpHandler.op',
          data,
          function(response) {
            if (response.err)
              return debug('io:in:room:op error: ', response);
          }
      );
    },
    roomDeop: function(name, username) {
      var data = {name: name, username: username};
      debug('io:out:room:deop', data);
      var that = this;
      pomelo.request(
          'chat.roomDeopHandler.deop',
          data,
          function(response) {
            if (response.err)
              return debug('io:in:room:deop error: ', response);
          }
      );
    },
    roomKick: function(name, username, reason) {
      var data = {name: name, username: username};
      if (reason)
        data.reason = reason;
      debug('io:out:room:kick', data);
      var that = this;
      pomelo.request(
          'chat.roomKickHandler.kick',
          data,
          function(response) {
            if (response.err)
              return debug('io:in:room:kick error: ', response);
          }
      );
    },
    roomBan: function(name, username, reason) {
      var data = {name: name, username: username};
      if (reason)
        data.reason = reason;
      debug('io:out:room:ban', data);
      var that = this;
      pomelo.request(
          'chat.roomBanHandler.ban',
          data,
          function(response) {
            if (response.err)
              return debug('io:in:room:ban error: ', response);
          }
      );
    },
    roomDeban: function(name, username) {
      var data = {name: name, username: username};
      debug('io:out:room:deban', data);
      var that = this;
      pomelo.request(
          'chat.roomDebanHandler.deban',
          data,
          function(response) {
            if (response.err)
              return debug('io:in:room:deban error: ', response);
          }
      );
    },
    roomViewed: function(name, events) {
      var data = {name: name, events: events};
      pomelo.notify('chat.roomViewedHandler.viewed', data);
      debug('io:out:room:viewed', data);
    },

    // USER METHODS
    // ======================================================

    userJoin: function(username) {
      var data = {username: username};
      debug('io:out:user:join', data);
      var that = this;
      pomelo.request(
          'chat.userJoinHandler.join',
          data,
          function(response) {
            if (response.err)
              return debug('io:in:user:join error: ', response);
          }
      );
    },
    userLeave: function(username) {
      var data = {username: username};
      pomelo.notify('chat.userLeaveHandler.leave', data);
      debug('io:out:user:leave', data);
    },
    userMessage: function(username, message, images) {
      var data = {username: username, message: message, images: images};
      pomelo.notify('chat.userMessageHandler.message', data);
      debug('io:out:user:message', data);
    },
    userRead: function(username, fn) {
      var data = {username: username};
      debug('io:out:user:read', data);
      var that = this;
      pomelo.request(
          'chat.userReadHandler.read',
          data,
          function(response) {
            if (response.err)
              return debug('io:in:user:read error: ', response);

            debug('io:in:user:read', response);
            return fn(response);
          }
      );
    },
    userUpdate: function(fields, fn) {
      var data = {data: fields};
      debug('io:out:user:update', data);
      var that = this;
      pomelo.request(
          'chat.userUpdateHandler.update',
          data,
          function(response) {
            debug('io:in:user:update', response);
            return fn(response);
          }
      );
    },
    userPreferencesRead: function(fn) {
      debug('io:out:user:preferences:read');
      var that = this;
      pomelo.request(
          'chat.userPreferencesHandler.read',
          {},
          function(response) {
            if (response.err)
              return debug('io:out:user:preferences:read error: ', response);

            debug('io:out:user:preferences:read', response);
            return fn(response);
          }
      );
    },
    userPreferencesUpdate: function(fields, fn) {
      var data = {data: fields};
      debug('io:out:user:preferences:update', data);
      var that = this;
      pomelo.request(
          'chat.userPreferencesHandler.update',
          data,
          function(response) {
            debug('io:in:user:preferences:update', response);
            return fn(response);
          }
      );
    },
    userHistory: function(username, since, fn) {
      var data = {username: username, since: since};
      debug('io:out:user:history', data);
      var that = this;
      pomelo.request(
          'chat.userHistoryHandler.history',
          data,
          function(response) {
            if (response.err)
              return debug('io:in:user:history error: ', response);

            debug('io:in:user:history', response);
            return fn(response);
          }
      );
    },
    userViewed: function(username, events) {
      var data = {username: username, events: events};
      pomelo.notify('chat.userViewedHandler.viewed', data);
      debug('io:out:user:viewed', data);
    }

  }, Backbone.Events);

  client.initialize();
  return client;
});