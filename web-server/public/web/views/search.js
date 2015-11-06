var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var client = require('../libs/client');
var app = require('../libs/app');
var CardsView = require('./cards');

var SearchPageView = Backbone.View.extend({
  el: $('#search'),
  template: require('../templates/search.html'),

  timeout: 0,
  timeBufferBeforeSearch: 500,
  lastSearch: '',
  limit: 100,

  events: {
    'keyup input[type=text]': 'onKeyup',
    'click .load-more': 'onLoadMore',
    'click .btn-group .btn': 'onKeyup',
    'change .checkbox-search': 'onKeyup'
  },

  initialize: function () {
  },

  render: function (data) {
    this.$el.html(this.template({data: data}));
    this.cardsView = new CardsView({
      el: this.$('.cards')
    });
    this.$search = this.$('input[type=text]').first();
    this.$searchMore = this.$('.load-more');
    this.$searchOptionsUsers = this.$('#search-options-users');
    this.$searchOptionsRooms = this.$('#search-options-rooms');
    this.$searchOptionsGroups = this.$('#search-options-groups');

    app.trigger('setTitle');
    app.trigger('changeColor');

    if (data && data.search && data.what) {
      return this.search(data.search, data.skip, data.what);
    }

    client.home(_.bind(this.onHome, this));
  },
  onHome: function (data) {
    data.fill = true;
    this.cardsView.render(data);
    this.$el.show();
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
    this.search(this.$search.val(), count, {
      users: this.$searchOptionsUsers.is(':checked'),
      rooms: this.$searchOptionsRooms.is(':checked'),
      groups: this.$searchOptionsGroups.is(':checked')
    });
  },
  onKeyup: function (event) {
    event.preventDefault();

    clearTimeout(this.timeout);
    this.timeout = setTimeout(_.bind(function () {
      this.search(this.$search.val(), null, {
        users: this.$searchOptionsUsers.is(':checked'),
        rooms: this.$searchOptionsRooms.is(':checked'),
        groups: this.$searchOptionsGroups.is(':checked')
      });
    }, this), this.timeBufferBeforeSearch);
  },
  search: function (s, skip, opt) {
    skip = skip || null;
    opt = opt
      || {
        users: true,
        rooms: true,
        groups: true
      };

    if (!s || s.length < 1) {
      return;
    }

    this.lastSearch = s;
    var options = {
      users: opt.users,
      rooms: opt.rooms,
      groups: opt.groups,
      limit: {
        users: this.limit,
        rooms: this.limit,
        groups: this.limit
      },
      skip: skip,
      mix: true
    };
    client.search(s, options, _.bind(function (data) {
      if (skip !== null) {
        data.append = true;
      }
      this.onSearchResults(data);
    }, this));
  }
});

module.exports = SearchPageView;
