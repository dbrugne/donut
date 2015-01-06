define([
  'underscore',
  'backbone',
  'socket.io',
  'pomelo'
], function (_, Backbone, io, pomelo) {
  var ClientModel = Backbone.Model.extend({

    debug: function(message) {
      console.log(message); // @debug
    },

    initialize: function() {
      // @debug
      localStorage.debug = ''; // ('*')

      // received events
      var that = this;
      pomelo.on('sioEvent', function(data) {
        if (!data)
          return;
        if (data.debug)
          that.debug(data.debug);
        if (data.event)
          that.trigger(data.event);

        // @todo : repair !!!!
        //if (err == 'notlogged')
        //  that.trigger('notlogged');
        //else
        //  that.trigger('error');
      });
      pomelo.on('welcome', function(data) {
        that.debug(['io:in:welcome', data]);
        that.trigger('welcome', data);
      });
      pomelo.on('room:join', function(data) {
        that.debug(['io:in:room:join', data]);
        that.trigger('room:join', data);
      });
      pomelo.on('room:leave', function(data) {
        that.debug(['io:in:room:leave', data]);
        that.trigger('room:leave', data);
      });
      pomelo.on('room:message', function(data) {
        that.debug(['io:in:room:message', data]);
        that.trigger('room:message', data);
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
      pomelo.on('room:updated', function(data) {
        that.debug(['io:in:room:updated', data]);
        that.trigger('room:updated', data);
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
      pomelo.on('user:join', function(data) {
        that.debug(['io:in:user:join', data]);
        that.trigger('user:join', data);
      });
      pomelo.on('user:leave', function(data) {
        that.debug(['io:in:user:leave', data]);
        that.trigger('user:leave', data);
      });
      pomelo.on('user:message', function(data) {
        that.debug(['io:in:user:message', data]);
        that.trigger('user:message', data);
      });
      pomelo.on('user:online', function(data) {
        that.debug(['io:in:user:online', data]);
        that.trigger('user:online', data);
      });
      pomelo.on('user:offline', function(data) {
        that.debug(['io:in:user:offline', data]);
        that.trigger('user:offline', data);
      });
      pomelo.on('user:updated', function(data) {
        that.debug(['io:in:user:updated', data]);
        that.trigger('user:updated', data);
      });
    },

    connect: function(port) {
      // should be done at the end of App initialization to allow interface binding to work
      pomelo.connect(port);
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
        console.log('status: ', data);
      });
    },
    statusMulti: function(uids) {
      pomelo.request('chat.adminHandler.statusMulti', {
        uids: uids
      }, function(data) {
        console.log('statusMulti: ', data);
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
        function(response) {
          if (response.err)
            return that.debug(['io:in:home error: ', response]);

          that.debug(['io:in:home', response]);
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
      this.debug(['io:out:search', data]);
      pomelo.request(
        'chat.searchHandler.search',
        data,
        function(response) {
          if (response.err)
            return that.debug(['io:in:search error: ', response]);

          that.debug(['io:in:search', response]);
          that.trigger('search', response);
        }
      );
    },

    // ROOM METHODS
    // ======================================================

    roomJoin: function(name) {
      var data = {name: name};
      this.debug(['io:out:room:join', data]);
      var that = this;
      pomelo.request(
        'chat.roomJoinHandler.join',
        data,
        function(response) {
          if (response.err)
            return that.debug(['io:in:room:join error: ', response]);
        }
      );
    },
    roomLeave: function(name) {
      var data = {name: name};
      pomelo.notify('chat.roomLeaveHandler.leave', data);
      this.debug(['io:out:room:leave', data]);
    },
    roomMessage: function(name, message, images) {
      var data = {name: name, message: message, images: images};
      pomelo.notify('chat.roomMessageHandler.message', data);
      this.debug(['io:out:room:message', data]);
    },
    roomTopic: function(name, topic) {
      var data = {name: name, topic: topic};
      this.debug(['io:out:room:topic', data]);
      var that = this;
      pomelo.request(
        'chat.roomTopicHandler.topic',
        data,
        function(response) {
          if (response.err)
            return that.debug(['io:in:room:topic error: ', response]);
        }
      );
    },
    roomRead: function(name, fn) {
      var data = {name: name};
      this.debug(['io:out:room:read', data]);
      var that = this;
      pomelo.request(
        'chat.roomReadHandler.read',
        data,
        function(response) {
          if (response.err)
            return that.debug(['io:in:room:read error: ', response]);

          that.debug(['io:in:room:read', response]);
          return fn(response);
        }
      );
    },
    roomUpdate: function(name, fields, fn) {
      var data = {name: name, data: fields};
      this.debug(['io:out:room:update', data]);
      var that = this;
      pomelo.request(
        'chat.roomUpdateHandler.update',
        data,
        function(response) {
          that.debug(['io:in:room:update', response]);
          return fn(response);
        }
      );
    },
    roomDelete: function(name) {
      var data = {name: name};
      this.debug(['io:out:room:delete', data]);
      var that = this;
      pomelo.request(
        'chat.roomDeleteHandler.delete',
        data,
        function(response) {
          if (response.err)
            return that.debug(['io:in:room:delete error: ', response]);
        }
      );
    },
    roomHistory: function(name, since, fn) {
      var data = {name: name, since: since};
      this.debug(['io:out:room:history', data]);
      var that = this;
      pomelo.request(
        'chat.roomHistoryHandler.history',
        data,
        function(response) {
          if (response.err)
            return that.debug(['io:in:room:history error: ', response]);

          that.debug(['io:in:room:history', response]);
          return fn(response);
        }
      );
    },
    roomOp: function(name, username) {
      var data = {name: name, username: username};
      this.debug(['io:out:room:op', data]);
      var that = this;
      pomelo.request(
        'chat.roomOpHandler.op',
        data,
        function(response) {
          if (response.err)
            return that.debug(['io:in:room:op error: ', response]);
        }
      );
    },
    roomDeop: function(name, username) {
      var data = {name: name, username: username};
      this.debug(['io:out:room:deop', data]);
      var that = this;
      pomelo.request(
        'chat.roomDeopHandler.deop',
        data,
        function(response) {
          if (response.err)
            return that.debug(['io:in:room:deop error: ', response]);
        }
      );
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
      this.debug(['io:out:user:join', data]);
      var that = this;
      pomelo.request(
        'chat.userJoinHandler.join',
        data,
        function(response) {
          if (response.err)
            return that.debug(['io:in:user:join error: ', response]);
        }
      );
    },
    userLeave: function(username) {
      var data = {username: username};
      pomelo.notify('chat.userLeaveHandler.leave', data);
      this.debug(['io:out:user:leave', data]);
    },
    userMessage: function(username, message, images) {
      var data = {username: username, message: message, images: images};
      pomelo.notify('chat.userMessageHandler.message', data);
      this.debug(['io:out:user:message', data]);
    },
    userRead: function(username, fn) {
      var data = {username: username};
      this.debug(['io:out:user:read', data]);
      var that = this;
      pomelo.request(
        'chat.userReadHandler.read',
        data,
        function(response) {
          if (response.err)
            return that.debug(['io:in:user:read error: ', response]);

          that.debug(['io:in:user:read', response]);
          return fn(response);
        }
      );
    },
    userUpdate: function(fields, fn) {
      var data = {data: fields};
      this.debug(['io:out:user:update', data]);
      var that = this;
      pomelo.request(
        'chat.userUpdateHandler.update',
        data,
        function(response) {
          that.debug(['io:in:user:update', response]);
          return fn(response);
        }
      );
    },
    userHistory: function(username, since, fn) {
      var data = {username: username, since: since};
      this.debug(['io:out:user:history', data]);
      var that = this;
      pomelo.request(
        'chat.userHistoryHandler.history',
        data,
        function(response) {
          if (response.err)
            return that.debug(['io:in:user:history error: ', response]);

          that.debug(['io:in:user:history', response]);
          return fn(response);
        }
      );
    }

  });

  return new ClientModel();
});