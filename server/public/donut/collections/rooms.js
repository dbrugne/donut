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
      this.listenTo(client, 'welcome', this.onWelcome);
      this.listenTo(client, 'room:leave', this.onLeave);
      this.listenTo(client, 'room:welcome', this.addModel);
      this.listenTo(client, 'room:kick', this.onKick);
    },
    /**
     * Executed each time the connexion with server is re-up (can occurs multiple
     * time in a same session)
     * @param data
     */
    onWelcome: function(data) {
      var that = this;
      _.each(data.rooms, function(room) {
        that.addModel(room);
      });
      this.trigger('redraw');
    },
    // We ask to server to join us in this room
    openPing: function(name) {
      client.join(name);
    },
    // Server confirm that we was joined to the room and give us some data on room
    addModel: function(room) {
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

      if (isNew) {
        // now the view exists (created by mainView)
        this.add(model);

        // hello notification
        model.events.addEvent({
          type: 'hello',
          data: {
            id: 'hello',
            name: model.get('name')
          }
        });

        // Add history
        if (room.history && room.history.length > 0) {
          room.history.reverse();
          _.each(room.history, function(event) {
            // @todo : TEMP TEMP TEMP
//            model.events.addEvent(event);
          });
        }
      }
    },
    // Server asks to this client to leave this room
    onLeave: function(data) {
      var room = this.get(data.name);
      // Only if already joined
      if (room) {
        this.remove(room);

        if (data.reason && data.reason == 'deleted')
          this.trigger('deleted', {reason: $.t("chat.deletemessage", {name: data.name})});
        else
          this.trigger('deleted');
      }
    },
    onKick: function(data) {
      if (!data.name)
        return;

      var room = this.get(data.name);
      if (!room)
        return;

      // if i'm the kicked user destroy the model/view
      if (currentUser.get('user_id') == data.user_id) {
        this.remove(room);
        this.trigger('kicked', data); // focus + alert
        return;
      }

      // check that target is in room.users
      var user = room.users.get(data.user_id);
      if (!user)
        return;

      // remove from this.users
      room.users.remove(user);

      // trigger notification
      room.events.addEvent({
        type: 'room:kick',
        data: data
      });
    }

  });

  return new RoomsCollection();
});