var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var client = require('../libs/client');
var app = require('../models/app');
var RoomsView = require('./home-rooms');
var UsersView = require('./home-users');
var SearchView = require('./home-search');

var HomeView = Backbone.View.extend({
  el: $('#home'),

  empty: true,

  initialize: function (options) {
    this.render();
    this.roomsView = new RoomsView({
      el: this.$('.rooms')
    });
    this.usersView = new UsersView({
      el: this.$('.users')
    });
    this.searchView = new SearchView({
      el: this.$('.search')
    });
    this.listenTo(this.searchView, 'searchResults', this.onSearchResults);
    this.listenTo(this.searchView, 'emptySearch', this.request);
  },
  render: function () {
    return this;
  },
  request: function () {
    client.home(_.bind(this.onHome, this));
  },
  focus: function () {
    if (this.empty) {
      this.request();
    }
    this.$el.show();
    app.trigger('setTitle');
    app.trigger('changeColor');
  },
  onHome: function (data) {
    // render both views even if no data to empty results list if no results
    // or empty result
    this.roomsView.render(data);
    this.usersView.render(data);
    this.empty = false;
  },
  onSearchResults: function (data) {
    data.search = true;
    this.onHome(data);
  }

});

module.exports = HomeView;
