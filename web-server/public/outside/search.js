var _ = require('underscore');
var Backbone = require('backbone');
var common = require('@dbrugne/donut-common/browser');
var template = require('../web/templates/rooms-cards.html');
var urls = require('../../../shared/util/url');

var SearchView = Backbone.View.extend({

  initialize: function () {
    this.$searchMore = this.$el.parents('.results').find('.load-more');
  },

  render: function (data) {
    var rooms = [];
    var protocol = window.location.protocol.replace(':', '');
    var fqdn = window.location.host;
    var _urls = {};
    _.each(data.rooms, function (room) {
      room.avatar = common.cloudinary.prepare(room.avatar, 135);
      if (room.is_group) {
        _urls = urls(room, 'group');
        room.url = protocol + '://' + fqdn + _urls.url;
        room.chat = _urls.chat;
        room.join = _urls.join;
      } else {
        _urls = urls(room, 'room');
        room.url = protocol + '://' + fqdn + _urls.url;
        room.chat = _urls.chat;
        room.join = _urls.join;
      }

      if (room.owner_username) {
        room.owner_url = protocol + '://' + fqdn + urls({ username: room.owner_username }, 'user', 'url');
      }

      rooms.push(room);
    });

    var html = template({
      rooms: data.rooms,
      title: false,
      search: data.search,
      more: data.more,
      replace: data.replace
    });

    if (data.replace) {
      this.$el.html(html);
    } else {
      this.$el.find('.list').append(html);
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
