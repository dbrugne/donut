var _ = require('underscore');
var Backbone = require('backbone');
var common = require('@dbrugne/donut-common/browser');
var template = require('../web/templates/rooms-cards.html');

var SearchView = Backbone.View.extend({

  initialize: function () {
    this.$searchMore = this.$el.parents('.results').find('.load-more');
  },

  render: function (data) {
    var rooms = [];
    var protocol = window.location.protocol;
    var fqdn = window.location.host;

    _.each(data.rooms, function (room) {
      room.avatar = common.cloudinary.prepare(room.avatar, 135);

      var identifier = room.name;
      room.url = protocol + '//' + fqdn + '/room/' + identifier;
      room.join = protocol + '//' + fqdn + '/!' + room.identifier;
      if (room.owner) {
        room.owner.url = protocol + '//' + fqdn + '/user/' +
          ('' + room.owner.username).toLocaleLowerCase();
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
