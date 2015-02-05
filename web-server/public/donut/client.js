define([
  'underscore',
  'backbone',
  'socket.io',
  'pomelo'
], function (_, Backbone, io, pomelo) {

  var client = _.extend({

    initialize: function() {

      // connection events
      pomelo.on('connect',            function() { window.debug.log('connect'); this.trigger('connect'); }, this);
      pomelo.on('disconnect',         function(reason) { window.debug.log('disconnect', reason); this.trigger('disconnect', reason); }, this);
      pomelo.on('error',              function(err) { window.debug.log('error', err); this.trigger('error', err); }, this);

      // reconnection events
      pomelo.on('reconnect',          function(num) { window.debug.log('reconnect', num); this.trigger('reconnect', num); }, this)
      pomelo.on('reconnect_attempt',  function() { window.debug.log('reconnect_attempt'); this.trigger('reconnect_attempt'); }, this);
      pomelo.on('reconnecting',       function(num) { window.debug.log('reconnecting', num); this.trigger('reconnecting', num); }, this);
      pomelo.on('reconnect_error',    function(err) { window.debug.log('reconnect_error', err); this.trigger('reconnect_error', err); }, this);
      pomelo.on('reconnect_failed',   function() { window.debug.log('reconnect_failed'); this.trigger('reconnect_failed'); }, this);

      pomelo.on('welcome', function(data) {
        window.debug.log('io:in:welcome', data);
        this.trigger('welcome', data);
      }, this);
      pomelo.on('room:join', function(data) {
        window.debug.log('io:in:room:join', data);
        this.trigger('room:join', data);
      }, this);
      pomelo.on('room:leave', function(data) {
        window.debug.log('io:in:room:leave', data);
        this.trigger('room:leave', data);
      }, this);
      pomelo.on('room:message', function(data) {
        window.debug.log('io:in:room:message', data);
        this.trigger('room:message', data);
      }, this);
      pomelo.on('room:topic', function(data) {
        window.debug.log('io:in:room:topic', data);
        this.trigger('room:topic', data);
      }, this);
      pomelo.on('room:in', function(data) {
        window.debug.log('io:in:room:in', data);
        this.trigger('room:in', data);
      }, this);
      pomelo.on('room:out', function(data) {
        window.debug.log('io:in:room:out', data);
        this.trigger('room:out', data);
      }, this);
      pomelo.on('room:updated', function(data) {
        window.debug.log('io:in:room:updated', data);
        this.trigger('room:updated', data);
      }, this);
      pomelo.on('room:op', function(data) {
        window.debug.log('io:in:room:op', data);
        this.trigger('room:op', data);
      }, this);
      pomelo.on('room:deop', function(data) {
        window.debug.log('io:in:room:deop', data);
        this.trigger('room:deop', data);
      }, this);
      pomelo.on('room:kick', function(data) {
        window.debug.log('io:in:room:kick', data);
        this.trigger('room:kick', data);
      }, this);
      pomelo.on('user:join', function(data) {
        window.debug.log('io:in:user:join', data);
        this.trigger('user:join', data);
      }, this);
      pomelo.on('user:leave', function(data) {
        window.debug.log('io:in:user:leave', data);
        this.trigger('user:leave', data);
      }, this);
      pomelo.on('user:message', function(data) {
        window.debug.log('io:in:user:message', data);
        this.trigger('user:message', data);
      }, this);
      pomelo.on('user:online', function(data) {
        window.debug.log('io:in:user:online', data);
        this.trigger('user:online', data);
      }, this);
      pomelo.on('user:offline', function(data) {
        window.debug.log('io:in:user:offline', data);
        this.trigger('user:offline', data);
      }, this);
      pomelo.on('user:updated', function(data) {
        window.debug.log('io:in:user:updated', data);
        this.trigger('user:updated', data);
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
        window.debug.log('status: ', data);
      });
    },
    statusMulti: function(uids) {
      pomelo.request('chat.adminHandler.statusMulti', {
        uids: uids
      }, function(data) {
        window.debug.log('statusMulti: ', data);
      });
    },

    // GLOBAL METHODS
    // ======================================================

    home: function() {
      var that = this;
      window.debug.log('io:out:home', {});
      pomelo.request(
          'chat.homeHandler.home',
          {},
          function(response) {
            if (response.err)
              return window.debug.log('io:in:home error: ', response);

            window.debug.log('io:in:home', response);
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
      window.debug.log('io:out:search', data);
      pomelo.request(
          'chat.searchHandler.search',
          data,
          function(response) {
            if (response.err)
              return window.debug.log('io:in:search error: ', response);

            window.debug.log('io:in:search', response);
            that.trigger('search', response);
          }
      );
    },

    // ROOM METHODS
    // ======================================================

    roomJoin: function(name) {
      var data = {name: name};
      window.debug.log('io:out:room:join', data);
      var that = this;
      pomelo.request(
          'chat.roomJoinHandler.join',
          data,
          function(response) {
            if (response.err)
              return window.debug.log('io:in:room:join error: ', response);
          }
      );
    },
    roomLeave: function(name) {
      var data = {name: name};
      pomelo.notify('chat.roomLeaveHandler.leave', data);
      window.debug.log('io:out:room:leave', data);
    },
    roomMessage: function(name, message, images) {
      var data = {name: name, message: message, images: images};
      pomelo.notify('chat.roomMessageHandler.message', data);
      window.debug.log('io:out:room:message', data);
    },
    roomTopic: function(name, topic) {
      var data = {name: name, topic: topic};
      window.debug.log('io:out:room:topic', data);
      var that = this;
      pomelo.request(
          'chat.roomTopicHandler.topic',
          data,
          function(response) {
            if (response.err)
              return window.debug.log('io:in:room:topic error: ', response);
          }
      );
    },
    roomRead: function(name, fn) {
      var data = {name: name};
      window.debug.log('io:out:room:read', data);
      var that = this;
      pomelo.request(
          'chat.roomReadHandler.read',
          data,
          function(response) {
            if (response.err)
              return window.debug.log('io:in:room:read error: ', response);

            window.debug.log('io:in:room:read', response);
            return fn(response);
          }
      );
    },
    roomUpdate: function(name, fields, fn) {
      var data = {name: name, data: fields};
      window.debug.log('io:out:room:update', data);
      var that = this;
      pomelo.request(
          'chat.roomUpdateHandler.update',
          data,
          function(response) {
            window.debug.log('io:in:room:update', response);
            return fn(response);
          }
      );
    },
    roomDelete: function(name) {
      var data = {name: name};
      window.debug.log('io:out:room:delete', data);
      var that = this;
      pomelo.request(
          'chat.roomDeleteHandler.delete',
          data,
          function(response) {
            if (response.err)
              return window.debug.log('io:in:room:delete error: ', response);
          }
      );
    },
    roomHistory: function(name, since, fn) {
      var data = {name: name, since: since};
      window.debug.log('io:out:room:history', data);
      var that = this;
      pomelo.request(
          'chat.roomHistoryHandler.history',
          data,
          function(response) {
            if (response.err)
              return window.debug.log('io:in:room:history error: ', response);

            window.debug.log('io:in:room:history', response);
            return fn(response);
          }
      );
    },
    roomOp: function(name, username) {
      var data = {name: name, username: username};
      window.debug.log('io:out:room:op', data);
      var that = this;
      pomelo.request(
          'chat.roomOpHandler.op',
          data,
          function(response) {
            if (response.err)
              return window.debug.log('io:in:room:op error: ', response);
          }
      );
    },
    roomDeop: function(name, username) {
      var data = {name: name, username: username};
      window.debug.log('io:out:room:deop', data);
      var that = this;
      pomelo.request(
          'chat.roomDeopHandler.deop',
          data,
          function(response) {
            if (response.err)
              return window.debug.log('io:in:room:deop error: ', response);
          }
      );
    },
    roomKick: function(name, username, reason) {
      var data = {name: name, username: username};
      if (reason)
        data.reason = reason;
      window.debug.log('io:out:room:kick', data);
      var that = this;
      pomelo.request(
          'chat.roomKickHandler.kick',
          data,
          function(response) {
            if (response.err)
              return window.debug.log('io:in:room:kick error: ', response);
          }
      );
    },

    // USER METHODS
    // ======================================================

    userJoin: function(username) {
      var data = {username: username};
      window.debug.log('io:out:user:join', data);
      var that = this;
      pomelo.request(
          'chat.userJoinHandler.join',
          data,
          function(response) {
            if (response.err)
              return window.debug.log('io:in:user:join error: ', response);
          }
      );
    },
    userLeave: function(username) {
      var data = {username: username};
      pomelo.notify('chat.userLeaveHandler.leave', data);
      window.debug.log('io:out:user:leave', data);
    },
    userMessage: function(username, message, images) {
      var data = {username: username, message: message, images: images};
      pomelo.notify('chat.userMessageHandler.message', data);
      window.debug.log('io:out:user:message', data);
    },
    userRead: function(username, fn) {
      var data = {username: username};
      window.debug.log('io:out:user:read', data);
      var that = this;
      pomelo.request(
          'chat.userReadHandler.read',
          data,
          function(response) {
            if (response.err)
              return window.debug.log('io:in:user:read error: ', response);

            window.debug.log('io:in:user:read', response);
            return fn(response);
          }
      );
    },
    userUpdate: function(fields, fn) {
      var data = {data: fields};
      window.debug.log('io:out:user:update', data);
      var that = this;
      pomelo.request(
          'chat.userUpdateHandler.update',
          data,
          function(response) {
            window.debug.log('io:in:user:update', response);
            return fn(response);
          }
      );
    },
    userHistory: function(username, since, fn) {
      var data = {username: username, since: since};
      window.debug.log('io:out:user:history', data);
      var that = this;
      pomelo.request(
          'chat.userHistoryHandler.history',
          data,
          function(response) {
            if (response.err)
              return window.debug.log('io:in:user:history error: ', response);

            window.debug.log('io:in:user:history', response);
            return fn(response);
          }
      );
    }

  }, Backbone.Events);

  client.initialize();
  return client;
});