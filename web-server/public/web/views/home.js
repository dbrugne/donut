var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var app = require('../libs/app');
var CardsView = require('./cards');
var HomeNewsView = require('./home-news');
var HomeFeaturedView = require('./home-featured');

var HomeView = Backbone.View.extend({
  el: $('#home'),
  templateSpinner: require('../templates/spinner.html'),
  templateStats: require('../templates/home-stats.html'),

  empty: true,
  featuredCount: 5, // number of featured to display in header

  events: {
    'click .filter-action': 'onClickFilterAction'
  },

  initialize: function (options) {
    this.render();

    var spinner = this.templateSpinner({});
    this.$('.spinner-content').html(spinner);
    this.$homeStats = this.$('.home-stats');

    this.homeNews = new HomeNewsView({
      el: this.$('.whats-new')
    });
    this.homeFeatured = new HomeFeaturedView({
      el: this.$('.featured')
    });
    this.cardsGroupsView = new CardsView({
      el: this.$('.cards .content .groups')
    });
    this.cardsRoomsView = new CardsView({
      el: this.$('.cards .content .rooms')
    });
  },
  render: function () {
    return this;
  },
  request: function () {
    app.client.home(_.bind(this.onHome, this));
  },
  focus: function () {
    if (this.empty) {
      this.request();
    }
    this.$el.show();
    app.trigger('setTitle');
  },
  onHome: function (data) {
    data.fill = true;
    this.$el.removeClass('loading');

    // prepare cards @todo unneeded when client.home updated
    var rooms = [];
    var groups = [];
    _.each(data.rooms.list, function (item) {
      if (item.type === 'room') {
        return rooms.push(item);
      }
      groups.push(item);
    });

    // @todo get it from stats handler or home handler
    //this.$homeStats.html(this.templateStats({
    //  messages_posted: 648,
    //  onetoones: 15,
    //  onetoones_unread: true,
    //  rooms: 57,
    //  rooms_unread: false,
    //  rooms_created: 7
    //}));

    //this.homeNews.render();
    this.homeFeatured.render(_.first(rooms, this.featuredCount), _.first(groups, this.featuredCount));
    this.cardsRoomsView.render({rooms: {list: _.rest(rooms, this.featuredCount)}});
    this.cardsGroupsView.render({groups: {list: _.rest(groups, this.featuredCount)}});
    this.empty = false;
  },
  onClickFilterAction: function (event) {
    var elt = $(event.currentTarget);

    // only care when changing selection
    if (elt.hasClass('active')) {
      return;
    }

    this.$('.filter-action').each(function () {
      $(this).toggleClass('active');
    });

    this.$('.cards-content').find('.toggle-cards').each(function () {
      $(this).toggleClass('hidden');
    });
  }
});

module.exports = HomeView;
