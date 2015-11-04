var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var client = require('../libs/client');
var app = require('../libs/app');
var CardsView = require('./cards');
var SearchView = require('./home-search');
var UsersView = require('./home-users');

var HomeView = Backbone.View.extend({
  el: $('#home'),

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
    this.usersView = new UsersView({
      el: this.$('.users')
    });
    this.$searchMore = this.$('.left .load-more');

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
    this.cardsView.render(_.omit(data, 'users'));
    this.usersView.render(_.omit(data, ['rooms', 'groups']));
    this.empty = false;
  },
  onSearchResults: function (data) {
    data.search = true;
    this.onHome(data);
    this.toggleMore(data);
  },
  toggleMore: function (data) {
    var count = this.cardsView.count();
    count.users = this.usersView.count();
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
    count.users = this.usersView.count();
    this.searchView.search(count);
  }
});

module.exports = HomeView;
