define([
  'underscore',
  'backbone',
  'models/client',
  'models/current-user',
  'models/room',
  'models/onetoone',
  'models/user'
], function (_, Backbone, client, currentUser, RoomModel, OneToOneModel, UserModel) {
  var DiscussionsCollection = Backbone.Collection.extend({

    thisDiscussionShouldBeFocusedOnSuccess: '',

    initialize: function() {
      /* Room specific */
      this.listenTo(client, 'room:join', this.onJoin);
      this.listenTo(client, 'room:leave', this.onLeave);
      this.listenTo(client, 'room:welcome', this.onWelcome);
      this.listenTo(client, 'room:message', this.onRoomMessage);

      /* OneToOne specific */
      this.listenTo(client, 'user:message', this.userMessage);
    },

    focusRoomByName: function(name) {
      var model = this.findWhere({ type: 'room', name: name });
      if (model == undefined) {
        // Create room
        // @todo : need to replace 'room.id' for identifying room by 'room.name' everywhere
        return;
      }

      this.focus(model);
    },

    focusOneToOneByUsername: function(username) {
      var model = this.findWhere({ type: 'onetoone', username: username });

      // Open discussion window if not already exist
      if (model == undefined) {
        // Create onetoone
        // @todo : need to replace 'user.id' for identifying room by 'user.username' everywhere
        //         the gravatar URL should be estimated by the username hash
        //         until that direct access to user one to one doesn't work
        return;
      }

      this.focus(model);
    },

    focus: function(model) {
      // No opened discussion, display default
      if (this.models.length < 1) {
        this.trigger('focusDefault');
        return;
      } else {
        this.trigger('unfocusDefault');
      }

      // No discussion provided, take first
      if (model == undefined) {
        model = this.first();
      }

      // Unfocus every model
      this.each(function(discussion, key, list) {
        discussion.set('focused', false); // @todo replace by emitting and event that unfocus every element?
      });

      // Focus the one we want
      model.set('focused', true);

      // Update URL
      var uri;
      if (model.get('type') == 'room') {
        uri = 'room/'+model.get('name').replace('#', '');
      } else {
        uri = 'user/'+model.get('username');
      }
      Backbone.history.navigate(uri);
    },

    /* Room specific */
    onJoin: function(data) {
      client.join(data.name);
    },

    /* Room specific */
    onLeave: function(data) {
      var room = this.get('room'+data.name);
      this.remove(room);
    },

    /* Room specific */
    onWelcome: function(room) {
      // Create room in browser
      var roomModel = new RoomModel({
        id: room.name, // @todo : duplicate room.id and room.name ?
        name: room.name,
        topic: room.topic
      });

      this.add(roomModel);

      // Add users
      _.each(room.users, function(element, key, list) {
        roomModel.users.add(new UserModel({
          username: element.username,
          avatar: element.avatar
        }));
      });

      // If caller indicate that this room should be focused on success
      //  OR if this is the first opened discussion
      if (this.thisDiscussionShouldBeFocusedOnSuccess == roomModel.get('name')
        || this.length == 1) {
        this.focus(roomModel);
      }

      roomModel.trigger('notification', {type: 'hello', name: roomModel.get('name')});
    },

    /* Room specific */
    onRoomMessage: function(data) {
      var model = this.get(data.name);
      model.message(data);
    },

    /* OneToOne specific */
    userMessage: function(message) {
      // Current user is emitter or recipient?
      var with_user_id;
      if (currentUser.get('user_id') == message.from_user_id) {
        // Emitter
        with_user_id = message.to_user_id;
      } else if (currentUser.get('user_id') == message.to_user_id) {
        // Recipient
        with_user_id = message.from_user_id; // i can also be this one if i spoke to myself...
      }

      model = this.addOneToOne(new UserModel({
        id: with_user_id,
        username: message.username,
        avatar: message.avatar
      }));

      // To have the same data between room and user messages (= same view code)
      message.user_id = message.from_user_id;

      model.message(message);
    },

    /* OneToOne specific */
    addOneToOne: function(user) {
      // Discussion already opened?
      var oneToOneId = 'onetoone'+user.get('id');
      var model = this.get(oneToOneId);
      if (model == undefined) {
        model = new OneToOneModel({
          id: oneToOneId,
          user_id: user.get('id'),
          username: user.get('username'),
          avatar: user.get('avatar')
        });
        this.add(model);
      }

      return model;
    }

  });

  return new DiscussionsCollection();
});