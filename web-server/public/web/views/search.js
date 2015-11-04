var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var client = require('../libs/client');
var app = require('../libs/app');
var CardsView = require('./cards');
var SearchView = require('./home-search');

var SearchPageView = Backbone.View.extend({
  el: $('#search'),

  empty: true,

  events: {
    'click .load-more': 'onLoadMore'
  },

  initialize: function (options) {
    this.render();
    this.searchView = new SearchView({
      el: this.$('.search')
    });
    this.cardsView = new CardsView({
      el: this.$('.cards')
    });
    this.$searchMore = this.$('.load-more');
    this.$searchOptionsUsers = this.$('#search-options-users');
    this.$searchOptionsRooms = this.$('#search-options-rooms');
    this.$searchOptionsGroups = this.$('#search-options-groups');

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
    data.fill = true;
    this.cardsView.render(data);
    this.empty = false;
  },
  onSearchResults: function (data) {
    data.search = true;
    this.onHome(data);
    this.toggleMore(data);
  },
  toggleMore: function (data) {
    var count = this.cardsView.count();
    var more =
      (data.rooms
        ? data.rooms.count > count.rooms
        : false) ||
      (data.groups
        ? data.groups.count > count.groups
        : false);

    if (more) {
      this.$searchMore.removeClass('hidden');
    } else {
      this.$searchMore.addClass('hidden');
    }
  },
  onLoadMore: function () {
    this.cardsView.cleanupEmpty();
    var count = this.cardsView.count();
    this.searchView.search(count, {
      users: this.$searchOptionsUsers.is(':checked'),
      rooms: this.$searchOptionsRooms.is(':checked'),
      groups: this.$searchOptionsGroups.is(':checked')
    });
  }
});

module.exports = SearchPageView;
