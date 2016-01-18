var _ = require('underscore');
var Backbone = require('backbone');
var date = require('../libs/date');
var common = require('@dbrugne/donut-common/browser');
var app = require('../libs/app');
var currentUser = require('../libs/app').user;

var RoomBlockedView = Backbone.View.extend({
  passwordPattern: /(.{4,255})$/i,

  template: require('../templates/discussion-room-blocked.html'),

  events: {
    'click .ask-for-allowance': 'onRequestAllowance',
    'click .close-room': 'onCloseRoom',
    'click .rejoin': 'onRejoin'
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
  onRequestAllowance: function (event) {
    event.preventDefault();

    app.client.roomJoin(this.model.get('id'), null, _.bind(function (response) {
      if (response && response.room) {
        app.trigger('openRoomJoin', response.room);
      } else {
        app.trigger('joinRoom', {name: this.model.get('name'), popin: false});
      }
    }, this));
  },
  onRejoin: function (event) {
    app.client.roomJoin(this.model.get('id'), function (response) {
      if (response.err) {
        this.$error
          .show()
          .text(i18next.t('chat.form.errors.' + response.err));
      }
    });
  },
  onCloseRoom: function (event) {
    event.preventDefault();
    app.client.roomLeaveBlock(this.model.get('id'));
  },
  initializeTooltips: function () {
    this.$el.find('[data-toggle="tooltip"]').tooltip({
      container: 'body'
    });
  }
});

module.exports = RoomBlockedView;
