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

  empty: true,
  active: 'groups',

  events: {
    'click .filter-action': 'onClickFilterAction'
  },

  initialize: function (options) {
    this.render();

    var spinner = this.templateSpinner({});
    this.$('.spinner-content').html(spinner);
    //this.$stats = this.$('.stats');
    this.whatsNew = new HomeNewsView({
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

    // @todo sort on position

    this.homeFeatured.render(data);
    this.cardsRoomsView.render({rooms: {list: rooms}});
    this.cardsGroupsView.render({groups: {list: groups}});
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
