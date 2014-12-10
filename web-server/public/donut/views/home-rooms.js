define([
  'jquery',
  'underscore',
  'backbone',
  'text!templates/home-rooms.html'
], function ($, _, Backbone, roomsTemplate) {
  var RoomsView = Backbone.View.extend({

    template: _.template(roomsTemplate),

    initialize: function(options) {
    },
    render: function(data) {
      var rooms = [];
      _.each(data.rooms, function(room) {
        room.avatar = $.cd.roomAvatar(room.avatar, 135, room.color);
        rooms.push(room);
      });

      var html = this.template({rooms: rooms, search: data.search});
      this.$el.html(html);
      this.$el.colorify();
      return this;
    }

  });

  return RoomsView;
});
