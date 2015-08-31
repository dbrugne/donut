define([
  'underscore',
  'backbone',
  'client',
  'models/current-user',
  'models/room',
  'models/user',
  'models/event'
], function (_, Backbone, client, currentUser, RoomModel, UserModel, EventModel) {
  var RoomsCollection = Backbone.Collection.extend({

    iwhere : function(key, val){ // insencitive case search
      var matches = this.filter(function(item){
        return item.get(key).toLocaleLowerCase() === val.toLocaleLowerCase();
      });

      if (matches.length < 1)
        return undefined;

      return matches[0];
    },

    initialize: function() {
      this.listenTo(client, 'room:in', this.onIn);
      this.listenTo(client, 'room:out', this.onOut);
      this.listenTo(client, 'room:topic', this.onTopic);
      this.listenTo(client, 'room:message', this.onMessage);
      this.listenTo(client, 'room:me', this.onMe);
      this.listenTo(client, 'room:op', this.onOp);
      this.listenTo(client, 'room:deop', this.onDeop);
      this.listenTo(client, 'room:updated', this.onUpdated);
      this.listenTo(client, 'user:online', this.onUserOnline);
      this.listenTo(client, 'user:offline', this.onUserOffline);
      this.listenTo(client, 'room:kick', this.onKick);
      this.listenTo(client, 'room:ban', this.onBan);
      this.listenTo(client, 'room:deban', this.onDeban);
      this.listenTo(client, 'room:voice', this.onVoice);
      this.listenTo(client, 'room:devoice', this.onDevoice);
      this.listenTo(client, 'room:join', this.onJoin);
      this.listenTo(client, 'room:leave', this.onLeave);
      this.listenTo(client, 'room:viewed', this.onViewed);
      this.listenTo(client, 'room:message:spam', this.onMessageSpam);
      this.listenTo(client, 'room:message:unspam', this.onMessageUnspam);
      this.listenTo(client, 'room:message:edit', this.onMessageEdited);
      this.listenTo(client, 'room:typing', this.onTyping);
    },
    onJoin: function(data) {
      // server ask to client to open this room in IHM
      this.addModel(data);
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
        devoices: room.devoices,
        topic: room.topic,
        avatar: room.avatar,
        poster: room.poster,
        posterblured: room.posterblured,
        color: room.color,
        unviewed: room.unviewed
      };

      // update model
      var isNew = (this.get(room.id) == undefined)
        ? true
        : false;
      if (!isNew) {
        // already exist in IHM (maybe reconnecting)
        var model = this.get(room.id);
        model.set(roomData);
      } else {
        // add in IHM
        roomData.id = room.id;
        var model = new RoomModel(roomData);
      }

      if (isNew) {
        this.add(model);
        // now the view exists (created by mainView)
      }
    },
    onIn: function(data) {
      var model;
      if (!data || !data.id || !(model = this.get(data.id)))
        return;

      model.onIn(data);
    },
    onOut: function(data) {
      var model;
      if (!data || !data.room_id || !(model = this.get(data.room_id)))
        return;

      model.onOut(data);
    },
    onTopic: function(data) {
      var model;
      if (!data || !data.room_id || !(model = this.get(data.room_id)))
        return;

      model.onTopic(data);
    },
    onMessage: function(data) {
      var model;
      if (!data || !data.room_id || !(model = this.get(data.room_id)))
        return;

      model.onMessage(data);
    },
    onMe: function(data) {
      var model;
      if (!data || !data.room_id || !(model = this.get(data.room_id)))
        return;

      model.onMe(data);
    },
    onOp: function(data) {
      var model;
      if (!data || !data.room_id || !(model = this.get(data.room_id)))
        return;

      model.onOp(data);
    },
    onDeop: function(data) {
      var model;
      if (!data || !data.room_id || !(model = this.get(data.room_id)))
        return;

      model.onDeop(data);
    },
    onUpdated: function(data) {
      var model;
      if (!data || !data.name || !(model = this.get(data.name)))
        return;

      model.onUpdated(data);
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
      this._kickBan('kick', data);
    },
    onBan: function(data) {
      this._kickBan('ban', data);
    },
    _kickBan: function(what, data) {
      var model;
      if (!data || !data.room_id || !(model = this.get(data.room_id)))
        return;

      // if i'm the "targeted user" destroy the model/view
      if (currentUser.get('user_id') == data.user_id) {
        this.remove(model);
        this.trigger('kickedOrBanned', {
          what: what,
          data: data
        }); // focus + alert
        return;
      }

      // check that target is in model.users
      var user = model.users.get(data.user_id);
      if (!user)
        return;

      // remove from this.users
      model.users.remove(user);
      model.users.trigger('users-redraw');

      // trigger event
      model.trigger('freshEvent', new EventModel({
        type: 'room:'+what,
        data: data
      }));
    },
    onDeban: function(data) {
      var model;
      if (!data || !data.name || !(model = this.get(data.name)))
        return;

      model.onDeban(data);
    },
    onVoice: function(data) {
      var model;
      if (!data || !data.room_id || !(model = this.get(data.room_id)))
        return;

      model.onVoice(data);
    },
    onDevoice: function(data) {
      var model;
      if (!data || !data.room_id || !(model = this.get(data.room_id)))
        return;

      model.onDevoice(data);
    },
    onLeave: function(data) {
      // server asks to this client to leave this room
      var model;
      if (!data || !data.room_id || !(model = this.get(data.room_id)))
        return;

      this.remove(model);

      if (data.reason && data.reason == 'deleted')
        this.trigger('deleted', {reason: $.t("chat.deletemessage", {name: data.name})});
      else
        this.trigger('deleted');
    },
    onViewed: function(data) {
      var model;
      if (!data || !data.name || !(model = this.get(data.name)))
        return;

      model.onViewed(data);
    },
    onMessageSpam: function(data) {
      var model;
      if (!data || !data.name || !(model = this.get(data.name)))
        return;

      model.trigger('messageSpam', data);
    },
    onMessageUnspam: function(data) {
      var model;
      if (!data || !data.name || !(model = this.get(data.name)))
        return;

      model.trigger('messageUnspam', data);
    },
    onMessageEdited: function(data) {
      var model;
      if (!data || !data.room_id || !(model = this.get(data.room_id)))
        return;

      model.trigger('messageEdit', data);
    },
    onTyping: function(data) {
      var model;
      if(!data || !data.name || !(model = this.get(data.name)))
        return;

      model.trigger('typing', data);
    }

  });

  return new RoomsCollection();
});