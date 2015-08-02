define([
  'jquery',
  'underscore',
  'backbone',
  'client',
  'views/home-rooms',
  'views/home-users',
  '_templates'
], function ($, _, Backbone, client, RoomsView, UsersView, templates) {
  var HomeView = Backbone.View.extend({

    el: $('#home'),

    template: templates['home.html'],

    initialize: function(options) {
      this.listenTo(client, 'home', this.onHome);

      this.render();

      this.roomsView = new RoomsView({el: this.$el.find('.rooms')});
      this.usersView = new UsersView({el: this.$el.find('.users')});
    },
    render: function() {
      var html = this.template({});
      this.$el.html(html);
      return this;
    },
    onHome: function(data) {
      // render both views even if no data to empty results list if no results
      // or empty result
      this.roomsView.render(data);
      this.usersView.render(data);
    }

  });

  return HomeView;
});
