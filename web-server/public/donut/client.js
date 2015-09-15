'use strict';
define([
  'underscore',
  'backbone',
  'libs/donut-debug',
  'libs/pomelo'
], function (_, Backbone, donutDebug, pomelo) {
  var debug = donutDebug('donut:client');

  var client = _.extend({
    initialize: function () {
      var events = [
        // connection/reconnection
        'connect',
        'disconnect',
        'error',
        'reconnect',
        'reconnect_attempt',
        'reconnecting',
        'reconnect_error',
        'reconnect_failed',
        // admin
        'admin:reload',
        'admin:exit',
        'admin:message',
        // donut
        'welcome',
        'room:join',
        'room:leave',
        'room:message',
        'room:message:edit',
        'room:topic',
        'room:in',
        'room:out',
        'room:updated',
        'room:op',
        'room:deop',
        'room:voice',
        'room:devoice',
        'room:kick',
        'room:allow',
        'room:disallow',
        'room:ban',
        'room:deban',
        'room:viewed',
        'room:message:spam',
        'room:message:unspam',
        'room:typing',
        'user:join',
        'user:leave',
        'user:message',
        'user:message:edit',
        'user:online',
        'user:offline',
        'user:updated',
        'user:viewed',
        'user:ban',
        'user:deban',
        'user:typing',
        'preferences:update',
        'notification:new',
        'notification:read',
        'notification:done'
      ];
      _.each(events, _.bind(function (event) {
        pomelo.on(event, function (data) {
          debug('io:in:' + event, data);
          this.trigger(event, data);
        }, this);
      }, this));
    },

    applyRequestCallback: function (key, callback) {
      return _.bind(function (response) {
        if (response.err) {
          debug('io:in:' + key + ' error: ', response);
        }
        if (_.isFunction(callback)) {
          return callback(response);
        }
      }, this);
    },

    /**
     * Should be done at the end of App initialization to allow interface
     * binding to work
     *
     * @param host could be use to force connection on given host
     * @param port could be use to force connection on given port
     */
    connect: function (host, port) {
      this.trigger('connecting');
      pomelo.connect(host, port);
    },
    disconnect: function () {
      pomelo.disconnect();
    },
    isConnected: function () {
      return pomelo.isConnected();
    },

    // GLOBAL
    // ======================================================

    home: function (callback) {
      debug('io:out:home', {});
      pomelo.request(
        'chat.homeHandler.call',
        {},
        this.applyRequestCallback('home', callback)
      );
    },
    search: function (search, rooms, users, limit, skip, light, callback) {
      var data = {
        search: search, // string to search for
        limit: (limit)
          ? limit
          : 100,
        skip: (skip)  // if the serach should skip n first items
          ? skip
          : 0,
        light: (light), // if the search should return a light version of results or not
        rooms: (rooms), // if we should search for rooms
        users: (users) // if we should search for users
      };
      debug('io:out:search', data);
      pomelo.request(
        'chat.searchHandler.call',
        data,
        this.applyRequestCallback('search', callback)
      );
    },
    ping: function (callback) {
      var start = Date.now();
      pomelo.request(
        'chat.pingHandler.call',
        {},
        function () {
          var duration = Date.now() - start;
          debug('io:in:ping');
          return callback(duration);
        }
      );
    },

    // ROOM
    // ======================================================

    roomJoin: function (roomId, roomName, password, callback) {
      var data = {};
      if (roomId) {
        data.room_id = roomId;
      } else if (roomName) {
        data.name = roomName;
      } else {
        return;
      }

      if (password) {
        data.password = password;
      }

      debug('io:out:room:join', data);
      pomelo.request(
        'chat.roomJoinHandler.call',
        data,
        this.applyRequestCallback('room:join', callback)
      );
    },
    roomLeave: function (roomId) {
      var data = {room_id: roomId};
      pomelo.notify('chat.roomLeaveHandler.call', data);
      debug('io:out:room:leave', data);
    },
    roomMessage: function (roomId, message, images, special, callback) {
      var data = {
        room_id: roomId,
        message: message,
        images: images,
        special: special
      };
      debug('io:out:room:message', data);
      pomelo.request(
        'chat.roomMessageHandler.call',
        data,
        this.applyRequestCallback('room:message', callback)
      );
    },
    roomMessageEdit: function (roomId, messageId, message, callback) {
      var data = {room_id: roomId, event: messageId, message: message};
      debug('io:out:room:message:edit');
      pomelo.request(
        'chat.roomMessageEditHandler.call',
        data,
        this.applyRequestCallback('room:message:edit', callback)
      );
    },
    roomTopic: function (roomId, topic, callback) {
      var data = {room_id: roomId, topic: topic};
      debug('io:out:room:topic', data);
      pomelo.request(
        'chat.roomTopicHandler.call',
        data,
        this.applyRequestCallback('room:topic', callback)
      );
    },
    roomRead: function (roomId, roomName, callback) {
      var data = {};
      if (roomId) {
        data.room_id = roomId;
      } else if (roomName) {
        data.name = roomName;
      } else {
        return;
      }

      debug('io:out:room:read', data);
      pomelo.request(
        'chat.roomReadHandler.call',
        data,
        this.applyRequestCallback('room:read', callback)
      );
    },
    roomUsers: function (roomId, attributes, callback) {
      var data = {room_id: roomId, attributes: attributes};
      debug('io:out:room:users', data);
      pomelo.request(
        'chat.roomUsersHandler.call',
        data,
        this.applyRequestCallback('room:users', callback)
      );
    },
    roomUpdate: function (roomId, fields, callback) {
      var data = {room_id: roomId, data: fields};
      debug('io:out:room:update', data);
      pomelo.request(
        'chat.roomUpdateHandler.call',
        data,
        this.applyRequestCallback('room:update', callback)
      );
    },
    roomCreate: function (name, mode, password, callback) {
      var data = {
        name: name,
        mode: mode,
        password: password
      };
      debug('io:out:room:create', data);
      pomelo.request(
        'chat.roomCreateHandler.call',
        data,
        this.applyRequestCallback('room:create', callback)
      );
    },
    roomDelete: function (roomId, callback) {
      var data = {room_id: roomId};
      debug('io:out:room:delete', data);
      pomelo.request(
        'chat.roomDeleteHandler.call',
        data,
        this.applyRequestCallback('room:delete', callback)
      );
    },
    roomHistory: function (roomId, since, limit, callback) {
      var data = {room_id: roomId, since: since, limit: limit};
      debug('io:out:room:history', data);
      pomelo.request(
        'chat.roomHistoryHandler.call',
        data,
        this.applyRequestCallback('room:history', callback)
      );
    },
    roomOp: function (roomId, userId, username, callback) {
      var data = {room_id: roomId};
      if (userId) {
        data.user_id = userId;
      } else if (username) {
        data.username = username;
      } else {
        return;
      }

      debug('io:out:room:op', data);
      pomelo.request(
        'chat.roomOpHandler.call',
        data,
        this.applyRequestCallback('room:op', callback)
      );
    },
    roomDeop: function (roomId, userId, username, callback) {
      var data = {room_id: roomId};
      if (userId) {
        data.user_id = userId;
      } else if (username) {
        data.username = username;
      } else {
        return;
      }

      debug('io:out:room:deop', data);
      pomelo.request(
        'chat.roomDeopHandler.call',
        data,
        this.applyRequestCallback('room:deop', callback)
      );
    },
    roomVoice: function (roomId, userId, username, callback) {
      var data = {room_id: roomId};
      if (userId) {
        data.user_id = userId;
      } else if (username) {
        data.username = username;
      } else {
        return;
      }

      debug('io:out:room:voice', data);
      pomelo.request(
        'chat.roomVoiceHandler.call',
        data,
        this.applyRequestCallback('room:voice', callback)
      );
    },
    roomDevoice: function (roomId, userId, username, reason, callback) {
      var data = {room_id: roomId};
      if (userId) {
        data.user_id = userId;
      } else if (username) {
        data.username = username;
      } else {
        return;
      }
      if (reason) {
        data.reason = reason;
      }
      debug('io:out:room:devoice', data);
      pomelo.request(
        'chat.roomDevoiceHandler.call',
        data,
        this.applyRequestCallback('room:devoice', callback)
      );
    },
    roomKick: function (roomId, userId, username, reason, callback) {
      var data = {room_id: roomId};
      if (userId) {
        data.user_id = userId;
      } else if (username) {
        data.username = username;
      } else {
        return;
      }
      if (reason) {
        data.reason = reason;
      }
      debug('io:out:room:kick', data);
      pomelo.request(
        'chat.roomKickHandler.call',
        data,
        this.applyRequestCallback('room:kick', callback)
      );
    },
    roomBan: function (roomId, userId, username, reason, callback) {
      var data = {room_id: roomId};
      if (userId) {
        data.user_id = userId;
      } else if (username) {
        data.username = username;
      } else {
        return;
      }
      if (reason) {
        data.reason = reason;
      }
      debug('io:out:room:ban', data);
      pomelo.request(
        'chat.roomBanHandler.call',
        data,
        this.applyRequestCallback('room:ban', callback)
      );
    },
    roomDeban: function (roomId, userId, username, callback) {
      var data = {room_id: roomId};
      if (userId) {
        data.user_id = userId;
      } else if (username) {
        data.username = username;
      } else {
        return;
      }
      debug('io:out:room:deban', data);
      pomelo.request(
        'chat.roomDebanHandler.call',
        data,
        this.applyRequestCallback('room:deban', callback)
      );
    },
    roomViewed: function (roomId, events) {
      var data = {room_id: roomId, events: events};
      pomelo.notify('chat.roomViewedHandler.call', data);
      debug('io:out:room:viewed', data);
    },
    roomMessageSpam: function (roomId, messageId, callback) {
      var data = {room_id: roomId, event: messageId};
      debug('io:out:room:message:spam', data);
      pomelo.request(
        'chat.roomMessageSpamHandler.call',
        data,
        this.applyRequestCallback('room:message:spam', callback)
      );
    },
    roomMessageUnspam: function (roomId, messageId, callback) {
      var data = {room_id: roomId, event: messageId};
      debug('io:out:room:message:unspam', data);
      pomelo.request(
        'chat.roomMessageUnspamHandler.call',
        data,
        this.applyRequestCallback('room:message:unspam', callback)
      );
    },
    roomTyping: function (roomId) {
      var data = {room_id: roomId};
      debug('io:out:room:typing', data);
      pomelo.notify('chat.roomTypingHandler.call', data);
    },
    roomJoinRequest: function (roomId, callback) {
      var data = {room_id: roomId};
      debug('io:out:room:join:request', data);
      pomelo.request(
        'chat.roomJoinRequestHandler.call',
        data,
        this.applyRequestCallback('room:join:request', callback)
      );
    },
    roomAllow: function (roomId, userId, notification, callback) {
      var data = {room_id: roomId, user_id: userId, notification: notification};
      debug('io:out:room:allow', data);
      pomelo.request(
        'chat.roomAllowHandler.call',
        data,
        this.applyRequestCallback('room:allow', callback)
      );
    },
    roomRefuse: function (roomId, userId, callback) {
      var data = {room_id: roomId, user_id: userId};
      debug('io:out:room:refuse', data);
      pomelo.request(
        'chat.roomAllowHandler.refuse',
        data,
        this.applyRequestCallback('room:refuse', callback)
      );
    },
    roomDisallow: function (roomId, userId, callback) {
      var data = {room_id: roomId, user_id: userId};
      debug('io:out:room:disallow', data);
      pomelo.request(
        'chat.roomDisallowHandler.call',
        data,
        this.applyRequestCallback('room:disallow', callback)
      );
    },

    // ONETOONE
    // ======================================================

    userJoin: function (username, callback) {
      var data = {username: username};
      debug('io:out:user:join', data);
      pomelo.request(
        'chat.userJoinHandler.call',
        data,
        this.applyRequestCallback('user:join', callback)
      );
    },
    userLeave: function (userId) {
      var data = {user_id: userId};
      pomelo.notify('chat.userLeaveHandler.call', data);
      debug('io:out:user:leave', data);
    },
    userBan: function (userId, username, callback) {
      var data;
      if (userId) {
        data = {user_id: userId};
      } else if (username) {
        data = {username: username};
      } else {
        return;
      }
      debug('io:out:user:ban', data);
      pomelo.request(
        'chat.userBanHandler.call',
        data,
        this.applyRequestCallback('user:ban', callback)
      );
    },
    userDeban: function (userId, username, callback) {
      var data;
      if (userId) {
        data = {user_id: userId};
      } else if (username) {
        data = {username: username};
      } else {
        return;
      }
      debug('io:out:user:deban', data);
      pomelo.request(
        'chat.userDebanHandler.call',
        data,
        this.applyRequestCallback('user:deban', callback)
      );
    },
    userMessage: function (userId, username, message, images, special, callback) {
      var data = {
        message: message,
        images: images
      };
      if (special) {
        data.special = special;
      }
      if (userId) {
        data.user_id = userId;
      } else if (username) {
        data.username = username;
      } else {
        return;
      }
      debug('io:out:user:message', data);
      pomelo.request(
        'chat.userMessageHandler.call',
        data,
        this.applyRequestCallback('user:message', callback)
      );
    },
    userMessageEdit: function (userId, messageId, message, callback) {
      var data = {user_id: userId, event: messageId, message: message};
      debug('io:out:user:message:edit', data);
      pomelo.request(
        'chat.userMessageEditHandler.call',
        data,
        this.applyRequestCallback('user:message:edit', callback)
      );
    },
    userRead: function (userId, username, callback) {
      var data = {};
      if (userId) {
        data.user_id = userId;
      } else if (username) {
        data.username = username;
      } else {
        return;
      }

      debug('io:out:user:read', data);
      pomelo.request(
        'chat.userReadHandler.call',
        data,
        this.applyRequestCallback('user:read', callback)
      );
    },
    userUpdate: function (fields, callback) {
      var data = {data: fields};
      debug('io:out:user:update', data);
      pomelo.request(
        'chat.userUpdateHandler.call',
        data,
        this.applyRequestCallback('user:update', callback)
      );
    },
    userHistory: function (userId, since, limit, callback) {
      var data = {user_id: userId, since: since, limit: limit};
      debug('io:out:user:history', data);
      pomelo.request(
        'chat.userHistoryHandler.call',
        data,
        this.applyRequestCallback('user:history', callback)
      );
    },
    userViewed: function (userId, events) {
      var data = {user_id: userId, events: events};
      pomelo.notify('chat.userViewedHandler.call', data);
      debug('io:out:user:viewed', data);
    },
    userTyping: function (userId) {
      var data = {user_id: userId};
      debug('io:out:user:typing', data);
      pomelo.notify('chat.userTypingHandler.call', data);
    },

    // PREFERENCES
    // ======================================================

    userPreferencesRead: function (roomId, callback) {
      var data = (roomId) ? {room_id: roomId} : {};
      debug('io:out:user:preferences:read', data);
      pomelo.request(
        'chat.preferencesReadHandler.call',
        data,
        this.applyRequestCallback('preferences:read', callback)
      );
    },
    userPreferencesUpdate: function (fields, callback) {
      var data = {data: fields};
      debug('io:out:preferences:update', data);
      pomelo.request(
        'chat.preferencesUpdateHandler.call',
        data,
        this.applyRequestCallback('preferences:update', callback)
      );
    },
    accountEmail: function (email, callback) {
      var data = {email: email};
      debug('io:out:account:email:edit');
      pomelo.request(
        'chat.accountEmailHandler.call',
        data,
        this.applyRequestCallback('account:email:edit', callback)
      );
    },
    accountPassword: function (newPassword, currentPassword, callback) {
      var data = {password: newPassword, current_password: currentPassword};
      debug('io:out:account:password:edit');
      pomelo.request(
        'chat.accountPasswordHandler.call',
        data,
        this.applyRequestCallback('account:password:edit', callback)
      );
    },

    // NOTIFICATION
    // ======================================================

    notificationRead: function (viewed, time, number, callback) {
      var data = {viewed: viewed, time: time, number: number};
      debug('io:out:notification:read', data);
      pomelo.request(
        'chat.notificationReadHandler.call',
        data,
        this.applyRequestCallback('notification:read', callback)
      );
    },
    notificationViewed: function (ids, all, callback) {
      var data = {ids: ids, all: all};
      debug('io:out:notification:viewed', data);
      pomelo.request(
        'chat.notificationViewedHandler.call',
        data,
        this.applyRequestCallback('notification:viewed', callback)
      );
    },
    notificationDone: function (id) {
      var data = {id: id};
      pomelo.notify('chat.notificationDoneHandler.call', data);
      debug('io:out:notification:done', data);
    }

  }, Backbone.Events);

  client.initialize();
  return client;
});
