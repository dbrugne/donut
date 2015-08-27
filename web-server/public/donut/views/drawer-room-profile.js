define([
  'jquery',
  'underscore',
  'backbone',
  'common',
  'client',
  'models/current-user',
  '_templates'
], function ($, _, Backbone, common, client, currentUser, templates) {
  var DrawerRoomProfileView = Backbone.View.extend({

      template: templates['drawer-room-profile.html'],

      id: 'room-profile',

      events: {
      },

      initialize: function (options) {
        this.mainView = options.mainView;
        this.roomName = options.name;

        // show spinner as temp content
        this.render();

        if (options.data)
          this.onResponse(options.data);

        // ask for data
        var that = this;
        client.roomRead(this.roomName, function(err, data) {
          if (err === 'unknown')
            return;
          if (!err)
            that.onResponse(data);
        });
      },
      render: function () {
          // render spinner only
          this.$el.html(templates['spinner.html']);
          return this;
      },
      onResponse: function (room) {
        room.isOwner = (room.owner)
          ? (room.owner.user_id == currentUser.get('user_id'))
          ? true
          : false
          : false;

        room.isAdmin = currentUser.isAdmin();

        room.avatar = common.cloudinarySize(room.avatar, 90);

        room.url = '/room/' + room.name.replace('#', '').toLocaleLowerCase();

        this._users(room); // decorate room object with users_list

        var html = this.template({room: room});
        this.$el.html(html);
        //this.$el.colorify();
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

          user.avatar = common.cloudinarySize(user.avatar, 34);

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