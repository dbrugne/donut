var _ = require('underscore');
var Backbone = require('backbone');
var date = require('../libs/date');
var common = require('@dbrugne/donut-common/browser');
var app = require('../libs/app');
var urls = require('../../../../shared/util/url');
var currentUser = require('../libs/app').user;

var RoomBlockedView = Backbone.View.extend({
  passwordPattern: /(.{4,255})$/i,

  template: require('../templates/discussion-room-blocked.html'),

  events: {
    'click .close-room': 'onCloseRoom',
    'click .join': 'onJoin'
  },

  initialize: function () {
    this.render();

    var groupData = null;
    if (this.model.get('group_id')) {
      app.client.groupRead(this.model.get('group_id'), null, _.bind(function (data) {
        if (!data.err) {
          data.created = date.longDate(data.created);
          data.avatarUrl = common.cloudinary.prepare(data.avatar, 100);
          data.join = urls(data, 'group', 'uri');
          groupData = data;
        }
        return this.onResponse(groupData);
      }, this));
    } else {
      return this.onResponse(groupData);
    }
  },
  render: function () {
    this.$el.html(require('../templates/spinner.html'));
    return this;
  },
  onResponse: function (groupData) {
    var data = this.model.toJSON();

    // banned_at
    if (data.banned_at) {
      data.banned_at = date.longDate(data.banned_at);
    }

    // avatar
    data.avatar = common.cloudinary.prepare(data.avatar, 150);

    // id
    data.room_id = this.model.get('id');

    // room mode
    data.mode = this.model.get('mode');

    // render
    var html = this.template({
      data: data,
      group: groupData,
      confirmed: currentUser.isConfirmed()
    });
    this.$el.html(html);
    this.$error = this.$('.error');

    this.initializeTooltips();

    return this;
  },
  removeView: function () {
    this.remove();
  },
  onJoin: function (event) {
    app.client.roomBecomeMember(this.model.get('id'), _.bind(function (data) {
      if (data.err) {
        return;
      }
      if (data && data.infos) {
        return app.trigger('openRoomJoin', data.infos);
      } else if (data.success) {
        app.client.roomJoin(this.model.get('id'), null, function (response) {
        });
      }
    }, this));
  },
  onCloseRoom: function (event) {
    event.preventDefault();
    this.model.leaveBlocked();
  },
  initializeTooltips: function () {
    this.$el.find('[data-toggle="tooltip"]').tooltip({
      container: 'body'
    });
  }
});

module.exports = RoomBlockedView;
