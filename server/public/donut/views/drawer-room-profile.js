define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'models/current-user',
  'text!templates/room-profile.html',
  'text!templates/spinner.html'
], function ($, _, Backbone, client, currentUser, roomProfileTemplate, spinnerTemplate) {
  var DrawerRoomProfileView = Backbone.View.extend({

      template: _.template(roomProfileTemplate),

      id: 'room-profile',

      events: {
      },

      initialize: function (options) {
          this.mainView = options.mainView;
          this.roomName = options.name;

          // show spinner as temp content
          this.render();

          // ask for data
          client.roomRead(this.roomName);

          // on response show profile
          this.listenTo(client, 'room:read', this.onRead);
      },
      render: function () {
          // render spinner only
          this.$el.html(_.template(spinnerTemplate)());
          return this;
      },
      onRead: function (room) {
        room.isOwner = (room.owner)
          ? (room.owner.user_id == currentUser.get('user_id'))
          ? true
          : false
          : false;

        room.avatar = $.cd.roomAvatar(room.avatar, 90, room.color);

        room.url = '/room/' + room.name.replace('#', '').toLocaleLowerCase();

        this._users(room); // decorate room object with users_list

        var html = this.template({room: room});
        this.$el.html(html);
        this.$el.colorify();
        this.$el.find('.website span').linkify();
        this.$el.find('.created span').momentify('date');

        if (room.color)
          this.trigger('color', room.color);
      },
      /**
       * Construct the room users list for profile displaying
       * For each set user_id, username, avatar and color
       * @param room
       * @private
       */
      _users: function (room) {
        var list = [];

        var alreadyIn = [];
        function pushNew(user, owner, op) {
          if (!user.user_id)
            return;

          if (alreadyIn.indexOf(user.user_id) !== -1)
            return;
          else
            alreadyIn.push(user.user_id);

          if (owner === true)
            user.isOwner = true;

          if (op === true)
            user.isOp = true;

          user.avatar = $.cd.userAvatar(user.avatar, 34, user.color);

          list.push(user);
        }

        if (room.owner)
          pushNew(room.owner, true, false);

        if (room.op && room.op.length > 0) {
          _.each(room.op, function(user) {
            pushNew(user, false, true);
          });
        }

        if (room.users && room.users.length > 0) {
          _.each(room.users, function(user) {
            pushNew(user, false, false);
          });
        }

        room.users_list = list;
      }

  });

  return DrawerRoomProfileView;
});