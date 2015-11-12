var _ = require('underscore');
var Backbone = require('backbone');
var common = require('@dbrugne/donut-common/browser');
var template = require('../web/templates/cards.html');
var urls = require('../../../shared/util/url');

var SearchView = Backbone.View.extend({

  initialize: function () {
    this.$searchMore = this.$el.parents('.results').find('.load-more');
  },

  render: function (data) {
    var cards = [];
    _.each(data.cards, function (card) {
      switch (card.type) {
        case 'user':
          card.avatar = common.cloudinary.prepare(card.avatar, 135);
          card.join = urls(card, 'user', 'chat');
          card.chat = urls(card, 'user', 'chat');
          break;
        case 'room':
          card.avatar = common.cloudinary.prepare(card.avatar, 135);
          card.join = urls(card, 'room', 'chat');
          card.url = urls(card, 'room', 'url');
          card.owner_url = urls({username: card.owner_username}, 'user', 'chat');
          if (card.group_id) {
            card.group_url = urls(card, 'group', 'uri');
            card.group_avatar = common.cloudinary.prepare(card.group_avatar, 200);
          }
          break;
        case 'group':
          card.avatar = common.cloudinary.prepare(card.avatar, 200);
          card.join = urls(card, 'group', 'chat');
          card.url = urls(card, 'group', 'url');
          card.owner_url = urls({username: card.owner_username}, 'user', 'chat');
          break;
      }
      cards.push(card);
    });

    var html = template({
      cards: cards,
      title: false,
      fill: true,
      search: false,
      more: data.more
    });

    if (data.replace) {
      this.$el.html(html);
    } else {
      this.$el.find('.card.empty').remove();  // remove last empty cards
      this.$el.append(html);
    }

    if (data.more) {
      this.$searchMore.removeClass('hidden');
    } else {
      this.$searchMore.addClass('hidden');
    }

    return this;
  }
});

module.exports = SearchView;
