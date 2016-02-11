var _ = require('underscore');
var Backbone = require('backbone');
var common = require('@dbrugne/donut-common/browser');
var urls = require('../../../../shared/util/url');

var HomeFeaturedView = Backbone.View.extend({
  template: require('../templates/home-featured.html'),

  events: {
    // @todo implement navigation sliders
  },

  initialize: function (options) {

  },
  render: function (list) {
    var groups = [];
    var rooms = [];

    _.each(list, function (card) {
      switch (card.type) {
        case 'room':
          card.avatar = common.cloudinary.prepare(card.avatar, 300);
          card.join = urls(card, 'room', 'uri');
          card.url = urls(card, 'room', 'url');
          if (card.group_id) {
            card.group_url = urls({name: card.group_name}, 'group', 'chat');
            card.group_avatar = common.cloudinary.prepare(card.group_avatar, 22);
          }
          rooms.push(card);
          break;
        case 'group':
          card.avatar = common.cloudinary.prepare(card.avatar, 300);
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
              c.avatar = common.cloudinary.prepare(c.avatar, 23);
            });
          }
          groups.push(card);
          break;
      }
    });

    var html = this.template({
      rooms: rooms,
      groups: groups
    });

    this.$el.html(html);
    this.initializeTooltips();

    return this;
  },

  initializeTooltips: function () {
    this.$('[data-toggle="tooltip"]').tooltip({
      container: 'body'
    });
  },

  _remove: function () {
    this.remove();
  },
});

module.exports = HomeFeaturedView;
