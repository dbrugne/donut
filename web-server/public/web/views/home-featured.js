var _ = require('underscore');
var Backbone = require('backbone');
var common = require('@dbrugne/donut-common/browser');
var urls = require('../../../../shared/util/url');

var HomeFeaturedView = Backbone.View.extend({
  template: require('../templates/home-featured.html'),
  events: {
    // @todo implement navigation sliders
  },
  render: function (list) {
    if (!_.has(list, 'rooms') || !_.has(list.rooms, 'list')) {
      return;
    }

    var groups = [];
    var rooms = [];

    _.each(list.rooms.list, function (card) {
      switch (card.type) {
        case 'room':
          card.avatar = common.cloudinary.prepare(card.avatar, 300);
          card.join = urls(card, 'room', 'uri');
          if (card.group_id) {
            card.group_avatar = common.cloudinary.prepare(card.group_avatar, 22);
          }
          rooms.push(card);
          break;
        case 'group':
          card.avatar = common.cloudinary.prepare(card.avatar, 300);
          card.join = urls(card, 'group', 'uri');
          card.url = urls(card, 'group', 'url');
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
  }
});

module.exports = HomeFeaturedView;
