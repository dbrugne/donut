var _ = require('underscore');
var Backbone = require('backbone');
var common = require('@dbrugne/donut-common/browser');
var urls = require('../../../../shared/util/url');

var CardsView = Backbone.View.extend({
  template: require('../templates/cards.html'),

  events: {
    'click a.join, .open-room-profile, .open-user-profile': 'onClose',
  },

  initialize: function (options) {

  },
  render: function (data) {
    var cards = [];
    var list = _.union(
      data.rooms
        ? data.rooms.list
        : [],
      data.groups
        ? data.groups.list
        : [],
      data.users
        ? data.users.list
        : []);

    _.each(list, function (card) {
      switch (card.type) {
        case 'user':
          card.avatar = common.cloudinary.prepare(card.avatar, 135);
          card.join = urls(card, 'user', 'uri');
          card.url = urls(card, 'user', 'url');
          card.owner_url = urls(card, 'user', 'chat');
          break;
        case 'room':
          card.avatar = common.cloudinary.prepare(card.avatar, 135);
          card.join = urls(card, 'room', 'uri');
          card.url = urls(card, 'room', 'url');
          if (card.group_id) {
            card.group_url = urls(card, 'group', 'chat');
            card.group_avatar = common.cloudinary.prepare(card.group_avatar, 200);
          }
          break;
        case 'group':
          card.avatar = common.cloudinary.prepare(card.avatar, 200);
          card.join = urls(card, 'group', 'uri');
          card.url = urls(card, 'group', 'url');
          break;
      }
      cards.push(card);
    });

    var html = this.template({
      cards: cards,
      title: true,
      fill: data.fill || false,
      search: data.search
    });

    if (data.append) {
      this.$el.append(html);
    } else {
      this.$el.html(html);
    }

    this.initializeTooltips();

    return this;
  },

  initializeTooltips: function () {
    this.$('[data-toggle="tooltip"]').tooltip({
      container: 'body'
    });
  },

  cleanupEmpty: function () {
    this.$('.card.empty').remove();
  },

  count: function () {
    return this.$('.card').length;
  },

  onClose: function (event) {
    this.trigger('onClose', event);
  },

  _remove: function () {
    this.remove();
  }

});

module.exports = CardsView;
