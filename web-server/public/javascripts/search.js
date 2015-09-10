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

    initialize: function (options) {
      this.$searchMore = this.$el.parents('.results').find('.load-more');
    },

    render: function (data) {
      var rooms = [];
      _.each(data.rooms, function (room) {
        room.avatar = common.cloudinarySize(room.avatar, 135);
        rooms.push(room);
      });

      var html = this.template({
        rooms: data.rooms,
        title: false,
        search: data.search,
        more: data.more,
        replace: data.replace
      });

      if (data.replace) {
        this.$el.html(html);
      } else {
        this.$el.find('.list').append(html);
      }

      if (data.more) {
        this.$searchMore.removeClass('hidden');
      } else {
        this.$searchMore.addClass('hidden');
      }

      return this;
    }
  });

  return SearchView;
});
