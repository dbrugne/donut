var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var common = require('@dbrugne/donut-common');

var RoomsView = Backbone.View.extend({
  template: require('../templates/rooms-cards.html'),

  initialize: function (options) {},
  render: function (data) {
    var rooms = [];
    _.each(data.rooms.list, function (room) {
      room.avatar = common.cloudinarySize(room.avatar, 135);
      room.join = '#room/' + room.name.replace('#', '');
      rooms.push(room);
    });

    var html = this.template({
      rooms: rooms,
      title: true,
      search: data.search,
      more: false,
      replace: true
    });

    this.$el.html(html);
    return this;
  }

});


module.exports = RoomsView;