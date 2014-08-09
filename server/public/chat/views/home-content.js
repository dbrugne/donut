define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'views/home-onlines',
  'text!templates/home-content.html'
], function ($, _, Backbone, client, homeOnlinesView, homeTemplate) {
  var HomeView = Backbone.View.extend({

    el: $('#content'),

    template: _.template(homeTemplate),

    initialize: function() {
      this.listenTo(client, 'home', this.render);
    },
    render: function(data) {
      var rooms = [];
      _.each(data.rooms, function(room) {
        room.avatar = $.c.roomAvatar(room.avatar, 'room-xlarge');
        rooms.push(room);
      });

      var html = this.template({rooms: rooms});
      this.$el.html(html);
      this.$el.colorify();
      return this;
    }

  });

  return new HomeView();
});
