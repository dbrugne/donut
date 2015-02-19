define([
  'jquery',
  'underscore',
  'backbone',
  'client',
  'models/current-user',
  'views/image-uploader',
  'views/color-picker',
  '_templates'
], function ($, _, Backbone, client, currentUser, ImageUploader, ColorPicker, templates) {
  var DrawerRoomUsersView = Backbone.View.extend({

    template: templates['drawer-room-users.html'],

    id: 'room-users',

    events  : {
      'submit form.room-form': 'onSubmit'
    },

    initialize: function(options) {
      this.mainView = options.mainView;
      this.roomName = options.name;

      // show spinner as temp content
      this.render();

      // ask for data
      var that = this;
      client.roomRead(this.roomName, function(data) {
        that.onResponse(data);
      });
    },
    render: function() {
      // render spinner only
      this.$el.html(templates['spinner.html']);
      return this;
    },
    onResponse: function(room) {
      this.roomName = room.name;

      // colorize drawer .opacity
      if (room.color)
        this.trigger('color', room.color);

      room.isOwner = (room.owner)
          ? (room.owner.user_id == currentUser.get('user_id'))
          ? true
          : false
          : false;

      // owner and ops aren't displayed in users list
      var notDisplayed = _.map(room.op, function(op) {
        return op.user_id;
      });
      if (room.owner)
        notDisplayed.push(room.owner.user_id);
      var users = _.filter(room.users, function(u) {
        return (notDisplayed.indexOf(u.user_id) === -1);
      });
      room.users = users;

      var html = this.template({room: room});
      this.$el.html(html);

      // color form
      this.$el.find('.room').colorify();
    }

  });

  return DrawerRoomUsersView;
});