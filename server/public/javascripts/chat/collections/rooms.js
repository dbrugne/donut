define([
  'underscore',
  'backbone',
  'models/client',
  'models/current-user',
  'models/room',
  'models/user'
], function (_, Backbone, client, currentUser, RoomModel, UserModel) {
  var RoomsCollection = Backbone.Collection.extend({
    initialize: function() {
      this.listenTo(client, 'room:join', this.onJoin);
      this.listenTo(client, 'room:leave', this.onLeave);
      this.listenTo(client, 'room:welcome', this.openPong);
      this.listenTo(client, 'room:message', this.onMessage);
    },
    // We ask to server to join us in this room
    openPing: function(name) {
      client.join(name);
    },
    // Server confirm that we was joined to the room and give us some data on room
    openPong: function(room) {
      if (this.get(room.name) != undefined) return; // when reconnecting

      var model = new RoomModel({
        id: room.name,
        name: room.name,
        topic: room.topic
      });

      // Add users
      _.each(room.users, function(element, key, list) {
        model.users.add(new UserModel({
          id: element.user_id,
          user_id: element.user_id,
          username: element.username
        }));
      });

      this.add(model);
      model.trigger('notification', {type: 'hello', name: model.get('name')}); // @todo move it from here ?
    },
    // Server asks to this client to join this room
    onJoin: function(data) {
      this.openPing(data.name);
    },
    // Server asks to this client to leave this room
    onLeave: function(data) {
      var room = this.get(data.name);
      this.remove(room);
    },

    onMessage: function(data) { // @todo : move it on room model
      var model = this.findWhere({ name: data.name });
      model.message(data);
      // Window new message indication
      this.trigger('newMessage');
    }

  });

  return new RoomsCollection();
});