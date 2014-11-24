define([
  'underscore',
  'backbone',
  'models/client',
  'models/current-user',
  'models/room',
  'models/user',
  'models/event'
], function (_, Backbone, client, currentUser, RoomModel, UserModel, EventModel) {
  var RoomsCollection = Backbone.Collection.extend({

    comparator: function(model1, model2) {
      return model1.get('name').replace('#', '').toLowerCase()
        .localeCompare(model2.get('name').replace('#', '').toLowerCase());
    },
    iwhere : function(key, val){ // insencitive case search
      var matches = this.filter(function(item){
        return item.get(key).toLocaleLowerCase() === val.toLocaleLowerCase();
      });

      if (matches.length < 1)
        return undefined;

      return matches[0];
    },

    initialize: function() {
      this.listenTo(client, 'disconnected', this.onDisconnect);
      this.listenTo(client, 'reconnected', this.onReconnect);
      this.listenTo(client, 'room:welcome', this.addModel);
      this.listenTo(client, 'room:in', this.onIn);
      this.listenTo(client, 'room:out', this.onOut);
      this.listenTo(client, 'room:topic', this.onTopic);
      this.listenTo(client, 'room:message', this.onMessage);
      this.listenTo(client, 'room:op', this.onOp);
      this.listenTo(client, 'room:deop', this.onDeop);
      this.listenTo(client, 'room:updated', this.onUpdated);
      this.listenTo(client, 'room:history', this.onHistory);
      this.listenTo(client, 'user:online', this.onUserOnline);
      this.listenTo(client, 'user:offline', this.onUserOffline);
      this.listenTo(client, 'room:kick', this.onKick);
      this.listenTo(client, 'room:leave', this.onLeave);
    },
    openPing: function(name) {
      client.join(name);
    },
    addModel: function(room) {
      // server confirm that we was joined to the room and give us some data on room

      // prepare model data
      var owner = (room.owner.user_id)
        ? new UserModel({
        id: room.owner.user_id,
        user_id: room.owner.user_id,
        username: room.owner.username,
        avatar: room.owner.avatar
      })
        : new UserModel();

      var roomData = {
        name: room.name,
        owner: owner,
        op: room.op,
        topic: room.topic,
        avatar: room.avatar,
        poster: room.poster,
        color: room.color
      };

      // update model
      var isNew = (this.get(room.name) == undefined)
        ? true
        : false;
      if (!isNew) {
        // already exist in IHM (maybe reconnecting)
        var model = this.get(room.name);
        model.set(roomData);
      } else {
        // add in IHM
        roomData.id = room.name;
        var model = new RoomModel(roomData);
      }

      // Add users
      model.users.reset();
      _.each(room.users, function(element, key, list) {
        model.addUser(element);
      });

      // Add history
      model.set('connectHistory', room.history);

      if (isNew) {
        this.add(model);
        // now the view exists (created by mainView)
      }
    },
    onDisconnect: function() {
      this.each(function(model) {
        model.onDisconnect();
      });
    },
    onReconnect: function() {
      this.each(function(model) {
        model.onReconnect();
      });
    },

    onIn: function(data) {
      var model;
      if (!data || !data.name || !(model = this.get(data.name)))
        return;

      model.onIn(data);
    },
    onOut: function(data) {
      var model;
      if (!data || !data.name || !(model = this.get(data.name)))
        return;

      model.onOut(data);
    },
    onTopic: function(data) {
      var model;
      if (!data || !data.name || !(model = this.get(data.name)))
        return;

      model.onTopic(data);
    },
    onMessage: function(data) {
      var model;
      if (!data || !data.name || !(model = this.get(data.name)))
        return;

      model.onMessage(data);
    },
    onOp: function(data) {
      var model;
      if (!data || !data.name || !(model = this.get(data.name)))
        return;

      model.onOp(data);
    },
    onDeop: function(data) {
      var model;
      if (!data || !data.name || !(model = this.get(data.name)))
        return;

      model.onDeop(data);
    },
    onUpdated: function(data) {
      var model;
      if (!data || !data.name || !(model = this.get(data.name)))
        return;

      model.onUpdated(data);
    },
    onHistory: function(data) {
      var model;
      if (!data || !data.name || !(model = this.get(data.name)))
        return;

      model.onHistory(data);
    },
    onUserOnline: function(data) {
      var model;
      if (!data || !data.name || !(model = this.get(data.name)))
        return;

      model.onUserOnline(data);
    },
    onUserOffline: function(data) {
      var model;
      if (!data || !data.name || !(model = this.get(data.name)))
        return;

      model.onUserOffline(data);
    },
    onKick: function(data) {
      var model;
      if (!data || !data.name || !(model = this.get(data.name)))
        return;

      // if i'm the kicked user destroy the model/view
      if (currentUser.get('user_id') == data.user_id) {
        this.remove(model);
        this.trigger('kicked', data); // focus + alert
        return;
      }

      // check that target is in model.users
      var user = model.users.get(data.user_id);
      if (!user)
        return;

      // remove from this.users
      model.users.remove(user);

      // trigger event
      model.trigger('freshEvent', new EventModel({
        type: 'room:kick',
        data: data
      }));
    },
    onLeave: function(data) {
      // server asks to this client to leave this room
      var model;
      if (!data || !data.name || !(model = this.get(data.name)))
        return;

      this.remove(model);

      if (data.reason && data.reason == 'deleted')
        this.trigger('deleted', {reason: $.t("chat.deletemessage", {name: data.name})});
      else
        this.trigger('deleted');
    }

  });

  return new RoomsCollection();
});