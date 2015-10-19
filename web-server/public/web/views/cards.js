var _ = require('underscore');
var Backbone = require('backbone');
var common = require('@dbrugne/donut-common/browser');
var urls = require('../../../../shared/util/url');

var CardsView = Backbone.View.extend({
  template: require('../templates/cards.html'),

  initialize: function (options) {

  },
  render: function (data) {
    var cards = [];
    _.each(data.cards.list, function (card) {
      switch (card.type) {
        case 'user':
          card.avatar = common.cloudinary.prepare(card.avatar, 135);
          card.join = urls(card, 'user', null, null, 'uri');
          card.owner_url = urls(card, 'user', null, null, 'chat');
          break;
        case 'room':
          card.avatar = common.cloudinary.prepare(card.avatar, 135);
          card.join = urls(card, 'room', null, null, 'uri');
          if (card.group_id) {
            card.group_url = urls(card, 'group', null, null, 'uri');
            card.group_avatar = common.cloudinary.prepare(card.group_avatar, 200);
          }
          break;
        case 'group':
          card.avatar = common.cloudinary.prepare(card.avatar, 200);
          card.join = urls(card, 'group', null, null, 'uri');
          break;
      }
      cards.push(card);
    });

    var html = this.template({
      cards: cards,
      title: true,
      fill: data.fill || false,
      search: data.search,
      more: data.cards.more
    });

    this.$el.html(html);
    return this;
  }

});

module.exports = CardsView;
