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
      this.listenTo(client, 'room:message', this.onRoomMessage);
    },

    openPing: function(name) {
      client.join(name);
    },

    openPong: function(room) {
      var model = new RoomModel({
        id: room.name, // @todo : duplicate room.id and room.name ?
        name: room.name,
        topic: room.topic
      });

      // Add users
      _.each(room.users, function(element, key, list) {
        model.users.add(new UserModel({
          id: element.user_id,
          username: element.username
        }));
      });

      this.add(model);
      model.trigger('notification', {type: 'hello', name: model.get('name')}); // @todo move it from here ?
    },

    onJoin: function(data) {
      client.join(data.name);
    },

    onLeave: function(data) {
      var room = this.get('room'+data.name);
      this.remove(room);
    },

    onRoomMessage: function(data) { // @todo : move it on room model
      var model = this.get(data.name);
      model.message(data);
      // Window new message indication
      this.trigger('newMessage');
    }

  });

  return new RoomsCollection();
});