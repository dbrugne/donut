var _ = require('underscore');
var Backbone = require('backbone');
var date = require('../libs/date');
var common = require('@dbrugne/donut-common/browser');
var i18next = require('i18next-client');
var app = require('../libs/app');
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
  },
  render: function () {
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
    var html = this.template({data: data, confirmed: currentUser.isConfirmed()});
    this.$el.html(html);
    this.$error = this.$('.error');

    this.initializeTooltips();

    return this;
  },
  removeView: function () {
    this.remove();
  },
  changeColor: function () {
    if (this.model.get('focused')) {
      app.trigger('changeColor', this.model.get('color'));
    }
  },
  onJoin: function (event) {
    app.client.roomBecomeMember(this.model.get('id'), _.bind(function (data) {
      if (data.err) {
        return;
      }
      if (data && data.infos) {
        app.trigger('openRoomJoin', data.infos);
      } else if (data.success) {
        app.trigger('joinRoom', {name: this.model.get('name'), popin: false});
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
