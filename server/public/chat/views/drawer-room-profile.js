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

//          var that = this;
//          this.$el.on('shown', function (e) {
//              that.$el.find('.website').linkify();
//          });
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

        var html = this.template({room: room});
        this.$el.html(html);
        this.$el.colorify();

        if (room.color)
          this.trigger('color', room.color);
      }
  });

  return DrawerRoomProfileView;
});