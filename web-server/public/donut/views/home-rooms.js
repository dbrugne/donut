'use strict';
define([
  'jquery',
  'underscore',
  'backbone',
  'common',
  '_templates'
], function ($, _, Backbone, common, templates) {
  var RoomsView = Backbone.View.extend({
    template: templates['rooms-cards.html'],

    initialize: function (options) {},
    render: function (data) {
      var rooms = [];
      _.each(data.rooms.list, function (room) {
        room.avatar = common.cloudinarySize(room.avatar, 135);
        rooms.push(room);
      });

      var html = this.template({
        rooms: rooms,
        title: true,
        search: data.search
      });

      this.$el.html(html);
      return this;
    }

  });

  return RoomsView;
});
