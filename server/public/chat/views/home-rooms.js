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
      _.each(data, function(room) {
        room.avatar = $.c.roomAvatar(room.avatar, 'room-xlarge');
        rooms.push(room);
      });

      var html = this.template({rooms: rooms});
      this.$el.html(html);
      this.$el.colorify();
      return this;
    }

  });

  return RoomsView;
});
