'use strict';
define([
  'jquery',
  'underscore',
  'backbone',
  'client',
  'views/home-rooms',
  'views/home-users',
  'views/home-search',
  '_templates'
], function ($, _, Backbone, client, RoomsView, UsersView, SearchView, templates) {
  var HomeView = Backbone.View.extend({
    el: $('#home'),

    template: templates['home.html'],

    initialize: function (options) {
      this.render();

      this.roomsView = new RoomsView({el: this.$el.find('.rooms')});
      this.usersView = new UsersView({el: this.$el.find('.users')});
      this.searchView = new SearchView({el: this.$el.find('.search')});
      this.listenTo(this.searchView, 'searchResults', this.onSearchResults);
      this.listenTo(this.searchView, 'emptySearch', this.request);
    },
    render: function () {
      var html = this.template({});
      this.$el.html(html);
      return this;
    },
    request: function () {
      client.home(_.bind(this.onHome, this));
    },
    onHome: function (data) {
      // render both views even if no data to empty results list if no results
      // or empty result
      this.roomsView.render(data);
      this.usersView.render(data);
    },
    onSearchResults: function (data) {
      data.search = true;
      this.onHome(data);
    }

  });

  return HomeView;
});
