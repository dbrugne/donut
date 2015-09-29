var _ = require('underscore');
var Backbone = require('backbone');
var app = require('../models/app');
var common = require('@dbrugne/donut-common/browser');
var client = require('../libs/client');
var currentUser = require('../models/current-user');
var date = require('../libs/date');

var DrawerRoomProfileView = Backbone.View.extend({
  template: require('../templates/drawer-room-profile.html'),

  id: 'room-profile',

  events: {},

  initialize: function (options) {
    this.roomId = options.room_id;

    // show spinner as temp content
    this.render();

    if (options.data) {
      this.onResponse(options.data);
    }

    // ask for data
    var that = this;
    client.roomRead(this.roomId, null, function (data) {
      if (data.err === 'unknown') {
        return;
      }
      if (!data.err) {
        that.onResponse(data);
      }
    });
  },
  render: function () {
    // render spinner only
    this.$el.html(require('../templates/spinner.html'));

    return this;
  },
  onResponse: function (room) {
    if (!room.name) {
      return app.trigger('drawerClose');
    }

    room.isOwner = (room.owner && room.owner.user_id === currentUser.get('user_id'));

    room.isAdmin = currentUser.isAdmin();

    room.avatar = common.cloudinary.prepare(room.avatar, 90);

    room.url = '/room/' + room.name.replace('#', '').toLocaleLowerCase();

    _.each(room.users, function (element, key, list) {
      element.avatar = common.cloudinary.prepare(element.avatar, 34);
    });

    var html = this.template({room: room});
    this.$el.html(html);
    date.from('date', this.$('.created span'));

    if (room.color) {
      this.trigger('color', room.color);
    }

    this.initializeTooltips();
  },
  initializeTooltips: function () {
    this.$el.find('[data-toggle="tooltip"][data-type="mode"]').tooltip({
      container: 'body'
    });
    this.$el.find('[data-toggle="tooltip"][data-type="room-users"]').tooltip({
      html: true,
      animation: false,
      container: 'body',
      template: '<div class="tooltip tooltip-home-users" role="tooltip"><div class="tooltip-inner right"></div></div>',
      title: function () {
        return '<div class="username" style="' + this.dataset.bgcolor + '">@' + this.dataset.username + '</div>';
      }
    });
  }

});

module.exports = DrawerRoomProfileView;
