var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var client = require('../client');
var RoomsView = require('./home-rooms');
var UsersView = require('./home-users');
var SearchView = require('./home-search');

var HomeView = Backbone.View.extend({
  el: $('#home'),

  template: require('../templates/home.html'),

  initialize: function (options) {
    this.render();

    this.roomsView = new RoomsView({el: this.$('.rooms')});
    this.usersView = new UsersView({el: this.$('.users')});
    this.searchView = new SearchView({el: this.$('.search')});
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


module.exports = HomeView;