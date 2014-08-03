define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'models/current-user',
  'text!templates/room-profile.html'
], function ($, _, Backbone, client, currentUser, roomProfileTemplate) {
  var DrawerRoomProfileView = Backbone.View.extend({

    template: _.template(roomProfileTemplate),

    id: 'room-profile',

    events  : {
    },

    initialize: function(options) {
      this.mainView = options.mainView;

      this.listenTo(client, 'room:read', this.onProfile);

      var that = this;
      this.$el.on('shown', function (e) {
        that.$el.find('.website').linkify();
      });
    },
    /**
     * Set this.$el content and call mainView.popin()
     */
    render: function(room) {
      room.isOwner = (room.owner)
       ? (room.owner.user_id == currentUser.get('user_id'))
         ? true
         : false
       : false;

      var html = this.template({room: room});
      this.$el.html(html);
      this.$el.colorify();

      this.mainView.popin({
        el: this.$el,
        color: room.color
      });

      return this;
    },
    onProfile: function(data) {
      this.render(data);
    }

  });

  return DrawerRoomProfileView;
});