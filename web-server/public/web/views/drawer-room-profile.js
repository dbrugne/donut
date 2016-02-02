var _ = require('underscore');
var Backbone = require('backbone');
var app = require('../libs/app');
var common = require('@dbrugne/donut-common/browser');
var currentUser = require('../libs/app').user;
var date = require('../libs/date');
var urls = require('../../../../shared/util/url');

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

    var what = {
      more: true,
      users: true,
      admin: false
    };
    app.client.roomRead(this.roomId, what, _.bind(function (data) {
      if (data.err === 'room-not-found') {
        return;
      }
      if (!data.err) {
        this.onResponse(data);
      }
    }, this));
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

    room.isOwner = (room.owner_id === currentUser.get('user_id'));

    room.isGroupOwner = (room.group_id && room.group_owner === currentUser.get('user_id'));

    room.isAdmin = app.user.isAdmin();
    room.avatar = common.cloudinary.prepare(room.avatar, 90);

    room.uri = room.identifier;
    room.url = urls(room, 'room', 'url');

    room.isDefault = (room.group_id) ? (room.group_default === room.room_id) : false;

    _.each(room.users, function (element, key, list) {
      element.avatar = common.cloudinary.prepare(element.avatar, 34);
    });

    var html = this.template({room: room});
    this.$el.html(html);
    date.from('date', this.$('.created span'));
    this.initializeTooltips();
  },
  initializeTooltips: function () {
    this.$el.find('[data-toggle="tooltip"]').tooltip({
      container: 'body'
    });
  }
});

module.exports = DrawerRoomProfileView;
