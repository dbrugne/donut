define([
  'underscore',
  'backbone',
  'models/client',
  'models/current-user',
  'models/room',
  'models/user'
], function (_, Backbone, client, currentUser, RoomModel, UserModel) {
  var RoomsCollection = Backbone.Collection.extend({

    comparator: function(model1, model2) {
      return model1.get('name').replace('#', '').toLowerCase()
        .localeCompare(model2.get('name').replace('#', '').toLowerCase());
    },

    initialize: function() {
      this.listenTo(client, 'room:join', this.onJoin);
      this.listenTo(client, 'room:leave', this.onLeave);
      this.listenTo(client, 'room:welcome', this.openPong);
    },
    // We ask to server to join us in this room
    openPing: function(name) {
      client.join(name);
    },
    // Server confirm that we was joined to the room and give us some data on room
    openPong: function(room) {
      if (this.get(room.name) != undefined) return; // when reconnecting

      var owner = new UserModel({
        id: room.owner.user_id,
        user_id: room.owner.user_id,
        username: room.owner.username,
        avatar: room.owner.avatar
      });
      var model = new RoomModel({
        id: room.name,
        name: room.name,
        owner: owner,
        topic: room.topic,
        avatar: room.avatar,
        color: room.color
      });

      // Add users
      _.each(room.users, function(element, key, list) {
        model.users.add(new UserModel({
          id: element.user_id,
          user_id: element.user_id,
          username: element.username,
          avatar: element.avatar
        }));
      });

      this.add(model);
      model.trigger('notification', {type: 'hello', name: model.get('name')}); // @todo move it from here ?
    },
    // Server asks to this client to join this room
    onJoin: function(data) {
      // Only if not already joined
      if (!this.get(data.name)) {
        this.openPing(data.name);
      }
    },
    // Server asks to this client to leave this room
    onLeave: function(data) {
      var room = this.get(data.name);
      // Only if already joined
      if (room) {
        this.remove(room);
      }
    }

  });

  return new RoomsCollection();
});