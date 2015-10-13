var _ = require('underscore');
var Backbone = require('backbone');
var donutDebug = require('./donut-debug');
var pomelo = require('./pomelo');

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
      'group:updated',
      'group:ban',
      'room:join',
      'room:request',
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
      'room:set:private',
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
      } else {
        debug('io:in:' + key + ': ', response);
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
  search: function (search, rooms, users, withGroup, limit, skip, light, callback) {
    var data = {
      search: search, // string to search for
      limit: limit || 100,
      skip: skip || 0,
      light: (light), // if the search should return a light version of results or not
      rooms: (rooms), // if we should search for rooms
      users: (users), // if we should search for users
      with_group: (withGroup) // if we should search room in a group
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

  // GROUP
  // ======================================================

  groupId: function (identifier, callback) {
    var data = {identifier: identifier};
    debug('io:out:group:id', data);
    pomelo.request(
      'chat.groupIdHandler.call',
      data,
      this.applyRequestCallback('group:id', callback)
    );
  },
  groupRead: function (groupId, what, callback) {
    var data = {};
    if (groupId) {
      data.group_id = groupId;
    } else {
      return;
    }

    if (what) {
      data.what = what;
    } else {
      data.what = {
        users: true,
        admin: true,
        rooms: true
      };
    }

    debug('io:out:group:read', data);
    pomelo.request(
      'chat.groupReadHandler.call',
      data,
      this.applyRequestCallback('group:read', callback)
    );
  },
  groupJoinRequest: function (groupId, message, callback) {
    var data = {group_id: groupId};
    if (message) {
      data.message = message;
    }
    debug('io:out:group:join:request', data);
    pomelo.request(
      'chat.groupJoinRequestHandler.call',
      data,
      this.applyRequestCallback('group:join:request', callback)
    );
  },
  groupAllow: function (groupId, userId, callback) {
    var data = {group_id: groupId, user_id: userId};
    debug('io:out:group:allow', data);
    pomelo.request(
      'chat.groupAllowHandler.call',
      data,
      this.applyRequestCallback('group:allow', callback)
    );
  },
  groupBan: function (groupId, userId, callback) {
    var data = {group_id: groupId, user_id: userId};
    debug('io:out:group:ban', data);
    pomelo.request(
      'chat.groupBanHandler.call',
      data,
      this.applyRequestCallback('group:ban', callback)
    );
  },
  groupUsers: function (groupId, attributes, callback) {
    var data = {group_id: groupId, attributes: attributes};
    debug('io:out:group:users', data);
    pomelo.request(
      'chat.groupUsersHandler.call',
      data,
      this.applyRequestCallback('group:users', callback)
    );
  },
  groupDisallow: function (groupId, userId, callback) {
    var data = {group_id: groupId, user_id: userId};
    debug('io:out:group:disallow', data);
    pomelo.request(
      'chat.groupDisallowHandler.call',
      data,
      this.applyRequestCallback('group:disallow', callback)
    );
  },
  groupRefuse: function (groupId, userId, callback) {
    var data = {group_id: groupId, user_id: userId};
    debug('io:out:group:refuse', data);
    pomelo.request(
      'chat.groupAllowHandler.refuse',
      data,
      this.applyRequestCallback('group:refuse', callback)
    );
  },

  groupCreate: function (groupName, callback) {
    var data = { group_name: groupName };
    debug('io:out:group:create', data);
    pomelo.request(
      'chat.groupCreateHandler.call',
      data,
      this.applyRequestCallback('group:create', callback)
    );
  },

  groupUpdate: function (groupId, fields, callback) {
    var data = {group_id: groupId, data: fields};
    debug('io:out:group:update', data);
    pomelo.request(
      'chat.groupUpdateHandler.call',
      data,
      this.applyRequestCallback('group:update', callback)
    );
  },
  groupDelete: function (groupId, callback) {
    var data = {group_id: groupId};
    debug('io:out:group:delete', data);
    pomelo.request(
      'chat.groupDeleteHandler.call',
      data,
      this.applyRequestCallback('group:delete', callback)
    );
  },
  groupJoin: function (groupId, password, callback) {
    var data = {group_id: groupId, password: password};
    debug('io:out:group:join', data);
    pomelo.request(
      'chat.groupJoinHandler.call',
      data,
      this.applyRequestCallback('group:join', callback)
    );
  },

  // ROOM
  // ======================================================

  roomId: function (identifier, callback) {
    var data = {identifier: identifier};
    debug('io:out:room:id', data);
    pomelo.request(
      'chat.roomIdHandler.call',
      data,
      this.applyRequestCallback('room:id', callback)
    );
  },
  roomJoin: function (roomId, password, callback) {
    var data = {};
    if (roomId) {
      data.room_id = roomId;
    } else {
      return;
    }

    if (password || password === '') {
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
  roomLeaveBlock: function (roomId) {
    var data = {room_id: roomId};
    pomelo.notify('chat.roomLeaveBlockHandler.call', data);
    debug('io:out:room:leave:block', data);
  },
  roomMessage: function (roomId, message, files, special, callback) {
    var data = {
      room_id: roomId,
      message: message,
      files: files,
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
  roomRead: function (roomId, what, callback) {
    var data = {};
    if (roomId) {
      data.room_id = roomId;
    } else {
      return;
    }

    if (what) {
      data.what = what;
    } else {
      data.what = {
        more: false,
        users: false,
        admin: false
      };
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
  roomCreate: function (name, mode, password, groupId, callback) {
    var data = {
      room_name: name,
      mode: mode,
      password: password
    };
    if (groupId) {
      data.group_id = groupId;
    }
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
  roomOp: function (roomId, userId, callback) {
    var data = {room_id: roomId};
    if (userId) {
      data.user_id = userId;
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
  roomDeop: function (roomId, userId, callback) {
    var data = {room_id: roomId};
    if (userId) {
      data.user_id = userId;
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
  roomVoice: function (roomId, userId, callback) {
    var data = {room_id: roomId};
    if (userId) {
      data.user_id = userId;
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
  roomDevoice: function (roomId, userId, reason, callback) {
    var data = {room_id: roomId};
    if (userId) {
      data.user_id = userId;
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
  roomKick: function (roomId, userId, reason, callback) {
    var data = {room_id: roomId};
    if (userId) {
      data.user_id = userId;
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
  roomBan: function (roomId, userId, reason, callback) {
    var data = {room_id: roomId};
    if (userId) {
      data.user_id = userId;
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
  roomDeban: function (roomId, userId, callback) {
    var data = {room_id: roomId};
    if (userId) {
      data.user_id = userId;
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
  roomJoinRequest: function (roomId, message, callback) {
    var data = {room_id: roomId};
    if (message) {
      data.message = message;
    }
    debug('io:out:room:join:request', data);
    pomelo.request(
      'chat.roomJoinRequestHandler.call',
      data,
      this.applyRequestCallback('room:join:request', callback)
    );
  },
  roomAllow: function (roomId, userId, callback) {
    var data = {room_id: roomId, user_id: userId};
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
  roomSetPrivate: function (roomId, callback) {
    var data = {room_id: roomId};
    debug('io:out:room:set:private', data);
    pomelo.request(
      'chat.roomSetPrivateHandler.call',
      data,
      this.applyRequestCallback('room:set:private', callback)
    );
  },

  // ONETOONE
  // ======================================================

  userId: function (username, callback) {
    var data = {username: username};
    debug('io:out:user:id', data);
    pomelo.request(
      'chat.userIdHandler.call',
      data,
      this.applyRequestCallback('user:id', callback)
    );
  },
  userJoin: function (userId, callback) {
    var data = {user_id: userId};
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
  userBan: function (userId, callback) {
    var data;
    if (userId) {
      data = {user_id: userId};
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
  userDeban: function (userId, callback) {
    var data;
    if (userId) {
      data = {user_id: userId};
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
  userMessage: function (userId, message, files, special, callback) {
    var data = {
      message: message,
      files: files
    };
    if (special) {
      data.special = special;
    }
    if (userId) {
      data.user_id = userId;
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
  userRead: function (userId, callback) {
    var data = {};
    if (userId) {
      data.user_id = userId;
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

  // HISTORY
  // ======================================================

  roomHistory: function (roomId, start, end, limit, callback) {
    this._history({
      room_id: roomId,
      start: start,
      end: end,
      limit: limit
    }, callback);
  },
  userHistory: function (userId, start, end, limit, callback) {
    this._history({
      user_id: userId,
      start: start,
      end: end,
      limit: limit
    }, callback);
  },
  _history: function (data, callback) {
    debug('io:out:history', data);
    pomelo.request(
      'history.historyHandler.call',
      data,
      this.applyRequestCallback('history', callback)
    );
  },

  // PREFERENCES
  // ======================================================

  userPreferencesRead: function (roomId, callback) {
    var data = (roomId)
      ? {room_id: roomId}
      : {};
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

module.exports = client;
