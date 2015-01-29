define([
  'underscore',
  'backbone',
  'models/client',
  'models/current-user',
  'models/user',
  'models/event',
  'collections/room-users'
], function (_, Backbone, client, currentUser, UserModel, EventModel, RoomUsersCollection) {
  var RoomModel = Backbone.Model.extend({

    defaults: function() {
      return {
        name: '',
        op: [],
        topic: '',
        avatar: '',
        poster: '',
        posterblured: '',
        color: '',
        type: 'room',
        focused: false,
        unread: 0
      };
    },

    initialize: function() {
      this.users = new RoomUsersCollection();
    },
    addUser: function(data) {
      // already in?
      var model = this.users.get(data.user_id);
      if (model) {
        // not sure this update is used in any case, but it's not expensive
        model.set('avatar', data.avatar);
        model.set('color', data.color);
        return model;
      }

      var is_owner = (this.get('owner') && this.get('owner').get('user_id') == data.user_id)
       ? true
       : false;

      var is_op = false;
      if (this.get('op')) {
        _.each(this.get('op'), function(opUser) {
          if (opUser.user_id == data.user_id) {
            is_op = true;
          }
        });
      }

      model = new UserModel({
        id: data.user_id,
        user_id: data.user_id,
        username: data.username,
        avatar: data.avatar,
        color: data.color,
        is_owner: is_owner,
        is_op: is_op,
        status: data.status
      });
      this.users.add(model);
      return model;
    },
    getUrl: function() {
      return window.location.protocol
        +'//'+window.location.host
        +'/room/'
        +this.get('name').replace('#', '').toLocaleLowerCase();
    },
    leave: function() {
      client.roomLeave(this.get('name'));
    },

    currentUserIsOwner: function() {
      if (!this.get('owner'))
        return false;

      return (this.get('owner').get('user_id') == currentUser.get('user_id'))
        ? true
        : false;
    },
    currentUserIsOp: function() {
      if (!this.get('op'))
        return false;

      var isOp = false;
      _.each(this.get('op'), function(op) {
        if (op.user_id == currentUser.get('user_id')) {
          isOp = true;
        }
      });

      return isOp;
    },

    onDisconnect: function() {
      var model = new EventModel({
        type: 'disconnected'
      });
      this.trigger('freshEvent', model);
    },
    onReconnect: function() {
      // manage reconnectHistory
      this.trigger('reconnectEvents');

      var model = new EventModel({
        type: 'reconnected'
      });
      this.trigger('freshEvent', model);
    },

    onIn: function(data) {
      data.status = 'online'; // only an online user can join a room
      var user = this.addUser(data);
      var model = new EventModel({
        type: 'room:in',
        data: data
      });
      this.trigger('freshEvent', model);
    },
    onOut: function(data) {
      var user = this.users.get(data.user_id);

      if (!user)
        return; // if user has more that one socket we receive n room:out

      this.users.remove(user);
      var model = new EventModel({
        type: 'room:out',
        data: data
      });
      this.trigger('freshEvent', model);
    },
    onTopic: function(data) {
      this.set('topic', data.topic);
      var model = new EventModel({
        type: 'room:topic',
        data: data
      });
      this.trigger('freshEvent', model);
    },
    onMessage: function(data) {
      var model = new EventModel({
        type: 'room:message',
        data: data
      });
      this.trigger('freshEvent', model);
    },
    onOp: function(data) {
      // room.get('op')
      var ops = this.get('op');
      ops.push(data);
      this.set('op', ops);

      // user.get('is_op')
      var user = this.users.get(data.user_id);
      if (user)
        user.set({is_op: true});
      this.users.sort();

      this.users.trigger('redraw');

      var model = new EventModel({
        type: 'room:op',
        data: data
      });
      this.trigger('freshEvent', model);
    },
    onDeop: function(data) {
      // room.get('op')
      var ops = [];
      _.each(this.get('op'), function(op) {
        if (op.user_id != data.user_id)
          ops.push(op);
      });
      this.set('op', ops);

      // user.get('is_op')
      var user = this.users.get(data.user_id);
      if (user)
        user.set({is_op: false});
      this.users.sort();

      this.users.trigger('redraw');

      var model = new EventModel({
        type: 'room:deop',
        data: data
      });
      this.trigger('freshEvent', model);
    },
    onUpdated: function(data) {
      var that = this;
      _.each(data.data, function(value, key, list) {
        that.set(key, value);
      });
    },
    _onStatus: function(expect, data) {
      var model = this.users.get(data.user_id);
      if (!model)
        return;

      if (model.get('status') == expect)
        return;

      model.set({status: expect});

      var model = new EventModel({
        type: 'user:'+expect,
        data: data
      });
      this.trigger('freshEvent', model);
    },
    onUserOnline: function(data) {
      this._onStatus('online', data);
    },
    onUserOffline: function(data) {
      this._onStatus('offline', data);
    },
    onHistory: function(data) {
      this.trigger('historyEvents', {
        history: data.history,
        more: data.more
      });
    },
    history: function(since) {
      var that = this;
      client.roomHistory(this.get('name'), since, function(data) {
        that.trigger('historyEvents', {
          history: data.history,
          more: data.more
        });
      });
    },

    sendMessage: function(message, images) {
      client.roomMessage(this.get('name'), message, images);
    }

  });

  return RoomModel;
});