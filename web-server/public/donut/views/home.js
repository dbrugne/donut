define([
  'jquery',
  'underscore',
  'backbone',
  'client',
  'views/home-rooms',
  'views/home-users',
  'views/home-search',
  'text!templates/home.html'
], function ($, _, Backbone, client, RoomsView, UsersView, SearchView, homeTemplate) {
  var HomeView = Backbone.View.extend({

    el: $('#home'),

    template: _.template(homeTemplate),

    initialize: function(options) {
      this.listenTo(client, 'home', this.onHome);
      this.listenTo(client, 'search', this.onSearch);

      this.render();

      this.roomsView = new RoomsView({el: this.$el.find('.rooms')});
      this.usersView = new UsersView({el: this.$el.find('.users')});
      this.searchView = new SearchView({el: this.$el.find('.search')});
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
    },
    onSearch: function(data) {
      if (!data.key || data.key != 'home')
        return; // RPC emulation, not a response for this view

      data.search = true;
      this.onHome(data);
    }

  });

  return HomeView;
});
