var _ = require('underscore');
var Backbone = require('backbone');
var common = require('@dbrugne/donut-common/browser');
var urls = require('../../../../shared/util/url');

var CardsView = Backbone.View.extend({
  template: require('../templates/cards.html'),
  templateSpinner: require('../templates/spinner.html'),

  events: {
    'click a.join, .open-room-profile, .open-user-profile': 'onClose'
  },

  initialize: function (options) {

  },
  render: function (data) {
    var cards = [];
    var list = data.all
      ? data.all.list // if cards have been mixed
      : _.union( // cards have not been mixed
      data.rooms
        ? data.rooms.list
        : [],
      data.groups
        ? data.groups.list
        : [],
      data.users
        ? data.users.list
        : []
    );

    _.each(list, function (card) {
      switch (card.type) {
        case 'user':
          card.avatar = common.cloudinary.prepare(card.avatar, 350);
          card.join = urls(card, 'user', 'uri');
          card.chat = urls(card, 'user', 'chat');
          card.owner_url = urls(card, 'user', 'chat');
          break;
        case 'room':
          card.avatar = common.cloudinary.prepare(card.avatar, 350);
          card.join = urls(card, 'room', 'uri');
          card.url = urls(card, 'room', 'url');
          if (card.group_id) {
            card.group_url = urls({name: card.group_name}, 'group', 'chat');
            card.group_avatar = common.cloudinary.prepare(card.group_avatar, 50);
          }
          break;
        case 'group':
          card.avatar = common.cloudinary.prepare(card.avatar, 350);
          card.join = urls(card, 'group', 'uri');
          card.url = urls(card, 'group', 'url');

          if (card.rooms) {
            // Prepare the 2/3 first rooms avatars
            card.roomsCount = card.rooms.length;
            card.rooms = _.first(card.rooms, 3);
            if (card.roomsCount > 3) { // if more than 3, display only 2 first avatars & room Count
              card.rooms.pop();
            }
            _.each(card.rooms, function (c) {
              c.avatar = common.cloudinary.prepare(c.avatar, 50);
            });
          }
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
    return {
      rooms: this.$('.card.card-room').length,
      groups: this.$('.card.card-group').length,
      users: this.$('.card.card-user').length
    };
  },

  onClose: function (event) {
    this.trigger('onClose', event);
  },

  _remove: function () {
    this.remove();
  },

  pending: function () {
    this.$el.html(this.templateSpinner);
  }

});

module.exports = CardsView;
