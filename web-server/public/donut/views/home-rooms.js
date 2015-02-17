define([
  'jquery',
  'underscore',
  'backbone',
  '_templates'
], function ($, _, Backbone, templates) {
  var RoomsView = Backbone.View.extend({

    template: templates['home-rooms.html'],

    initialize: function(options) {
    },
    render: function(data) {
      var rooms = [];
      _.each(data.rooms, function(room) {
        room.avatar = $.cd.roomAvatar(room.avatar, 135);
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
