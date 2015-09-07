define([
  'jquery',
  'underscore',
  'backbone',
  'common',
  'i18next',
  'text!../donut/templates/rooms-cards.html'
], function ($, _, Backbone, common, i18next, htmlTemplate) {

  var SearchView = Backbone.View.extend({

    template: _.template(htmlTemplate),

    initialize: function (options) { },

    render: function (data) {
      var rooms = [];
      _.each(data.rooms, function (room) {
        room.avatar = common.cloudinarySize(room.avatar, 135);
        rooms.push(room);
      });

      var html = this.template({
        rooms: data.rooms,
        title: false,
        search: data.search
      });

      this.$el.html(html);
      return this;
    }
  });

  return SearchView;
});
