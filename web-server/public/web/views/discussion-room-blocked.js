var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var keyboard = require('../libs/keyboard');
var i18next = require('i18next-client');
var date = require('../libs/date');
var common = require('@dbrugne/donut-common/browser');
var app = require('../libs/app');
var ConfirmationView = require('./modal-confirmation');
var currentUser = require('../libs/app').user;

var RoomBlockedView = Backbone.View.extend({
  passwordPattern: /(.{4,255})$/i,

  template: require('../templates/discussion-room-blocked.html'),

  events: {
    'click .ask-for-allowance': 'onRequestAllowance',
    'click .valid-password': 'onValidPassword',
    'keyup .input-password': 'onValidPassword',
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

    ConfirmationView.open({message: 'request-allowance', area: true}, _.bind(function (message) {
      app.client.roomJoinRequest(this.model.get('id'), message, _.bind(function (response) {
        if (response.err) {
          this.$error.show();
          if (response.err === 'not-confirmed') {
            this.$error.text(i18next.t('chat.form.errors.' + response.err));
          }
          if (response.err === 'not-allowed') {
            this.$error.text(i18next.t('chat.form.errors.' + response.err));
          } else if (response.code !== 500) {
            this.$error.text(i18next.t('chat.allowed.error.' + response.err));
          } else {
            this.$error.text(i18next.t('global.unknownerror'));
          }
        } else {
          app.trigger('alert', 'info', i18next.t('chat.allowed.success'));
        }
      }, this));
    }, this));
  },
  onValidPassword: function (event) {
    var key = keyboard._getLastKeyCode(event);
    if (event.type !== 'click' && key.key !== keyboard.RETURN) {
      return;
    }

    var password = $(event.currentTarget).closest('.password-form').find('.input-password').val();
    if (!this.passwordPattern.test(password)) {
      this.$error.show();
      this.$error.text(i18next.t('chat.password.invalid-password'));
      return;
    }
    app.client.roomJoin(this.model.get('id'), password, _.bind(function (response) {
      if (!response.err) {
        return;
      }

      this.$error.show();
      if (response.err === 'not-confirmed') {
        this.$error.text(i18next.t('chat.form.errors.' + response.err));
      } else {
        this.$error.text(i18next.t('chat.password.wrong-password'));
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
