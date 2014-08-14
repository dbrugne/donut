define([
  'underscore',
  'backbone',
  'models/client',
  'models/current-user',
  'models/room',
  'models/user',
  'models/message'
], function (_, Backbone, client, currentUser, RoomModel, UserModel, MessageModel) {
  var RoomsCollection = Backbone.Collection.extend({

    comparator: function(model1, model2) {
      return model1.get('name').replace('#', '').toLowerCase()
        .localeCompare(model2.get('name').replace('#', '').toLowerCase());
    },

    initialize: function() {
      this.listenTo(client, 'welcome', this.onWelcome);
      this.listenTo(client, 'room:leave', this.onLeave);
      this.listenTo(client, 'room:welcome', this.addModel);
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
        permanent: room.permanent,
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
        var is_op = (room.op.indexOf(element.user_id) !== -1)
          ? true
          : false;
        var is_owner = (room.owner.user_id && room.owner.user_id == element.user_id)
          ? true
          : false;
        model.users.add(new UserModel({
          id: element.user_id,
          user_id: element.user_id,
          username: element.username,
          avatar: element.avatar,
          is_owner: is_owner,
          is_op: is_op
        }));
      });
      window.t = model.users;

      this.add(model); // now the view exists (created by mainView)

      // Add history
      // @todo : deduplicate in case of reconnection (empty list?)
//      if (room.history && room.history.length > 0) {
//        _.each(room.history, function(event) {
//          if (event.type == 'room:message') {
//            model.messages.add(new MessageModel(event));
//          } else if (event.type == 'room:in') {
//            event.type = 'in';
//            model.trigger('notification', event);
//          } else if (event.type == 'room:out') {
//            event.type = 'out';
//            model.trigger('notification', event);
//          } else if (event.type = 'room:topic') {
//            event.type = 'topic';
//            model.trigger('notification', event);
//          }
//        });
//        model.trigger('separator', 'Previous messages');
//      }
      if (isNew) {
        model.trigger('notification', {type: 'hello', name: model.get('name')});
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