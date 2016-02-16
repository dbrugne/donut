var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var app = require('../libs/app');
var CardsView = require('./cards');
var HomeNewsView = require('./home-news');
var HomeFeaturedView = require('./home-featured');

var FETCH_EVERY = 5 * 60 * 1000;

var HomeView = Backbone.View.extend({
  el: $('#home'),
  templateSpinner: require('../templates/spinner.html'),
  templateStats: require('../templates/home-stats.html'),

  focusedTab: null,
  fetchedAt: null,

  events: {
    'click .filter-action[data-type="groups"]': 'onFocusTabGroups',
    'click .filter-action[data-type="rooms"]': 'onFocusTabRooms'
  },

  initialize: function (options) {
    this.$('.spinner-content').html(this.templateSpinner());

    this.$homeStats = this.$('.home-stats');

    this.homeNews = new HomeNewsView({
      el: this.$('.whats-new')
    });
    this.homeFeatured = new HomeFeaturedView({
      el: this.$('.featured')
    });

    this.$groupsTab = this.$('.filter-action[data-type="groups"]');
    this.cardsGroupsView = new CardsView({
      el: this.$('.cards-view .content .groups'),
      type: 'groups',
      loadData: function (skip, fn) {
        app.client.search({type: 'groups', limit: 9, skip: skip, full: true}, fn);
      }
    });

    this.$roomsTab = this.$('.filter-action[data-type="rooms"]');
    this.cardsRoomsView = new CardsView({
      el: this.$('.cards-view .content .rooms'),
      type: 'rooms',
      loadData: function (skip, fn) {
        app.client.search({type: 'rooms', limit: 9, skip: skip, full: true}, fn);
      }
    });
  },
  render: function () {
    return this;
  },
  focus: function () {
    if (!this.fetchedAt || this.fetchedAt < (Date.now() - FETCH_EVERY)) {
      this.fetchedAt = Date.now();
      app.client.home(6, _.bind(this.onHome, this));
    }

    this.$el.show();
    app.trigger('setTitle');
  },
  onHome: function (data) {
    this.$el.removeClass('loading');

    // @todo get it from home handler
    // this.$homeStats.html(this.templateStats({
    //   messages_posted: 648,
    //   onetoones: 15,
    //   onetoones_unread: true,
    //   rooms: 57,
    //   rooms_unread: false,
    //   rooms_created: 7
    // }));
    // this.homeNews.render();

    var groups = (data.groups && data.groups.list && data.groups.list.length)
      ? data.groups.list
      : [];
    var rooms = (data.rooms && data.rooms.list && data.rooms.list.length)
      ? data.rooms.list
      : [];
    this.homeFeatured.render(groups, rooms);

    // first load / reload
    if (this.cardsGroupsView.loaded) {
      this.cardsGroupsView.reset();
      this.cardsRoomsView.reset();
    }
    if (!this.focusedTab) {
      this.focusTabGroups();
    }
  },
  onFocusTabGroups: function (event) {
    event.preventDefault();
    this.focusTabGroups();
  },
  focusTabGroups: function () {
    this._unfocusTabs();
    if (!this.cardsGroupsView.loaded) {
      this.cardsGroupsView.load();
    }

    this.$groupsTab.addClass('active');
    this.cardsGroupsView.show();
  },
  onFocusTabRooms: function (event) {
    event.preventDefault();
    this.focusTabRooms();
  },
  focusTabRooms: function () {
    this._unfocusTabs();
    if (!this.cardsRoomsView.loaded) {
      this.cardsRoomsView.load();
    }

    this.$roomsTab.addClass('active');
    this.cardsRoomsView.show();
  },
  _unfocusTabs: function (which) {
    this.$groupsTab.removeClass('active');
    if (this.cardsGroupsView) {
      this.cardsGroupsView.hide();
    }
    this.$roomsTab.removeClass('active');
    if (this.cardsRoomsView) {
      this.cardsRoomsView.hide();
    }
  }
});

module.exports = HomeView;
