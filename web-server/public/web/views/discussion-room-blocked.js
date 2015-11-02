var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var keyboard = require('../libs/keyboard');
var i18next = require('i18next-client');
var date = require('../libs/date');
var common = require('@dbrugne/donut-common/browser');
var app = require('../libs/app');
var client = require('../libs/client');
var ConfirmationView = require('./modal-confirmation');

var RoomBlockedView = Backbone.View.extend({
  tagName: 'div',

  className: 'discussion',

  passwordPattern: /(.{4,255})$/i,

  hasBeenFocused: false,

  template: require('../templates/discussion-room-blocked.html'),

  events: {
    'click .ask-for-allowance': 'onRequestAllowance',
    'click .valid-password': 'onValidPassword',
    'keyup .input-password': 'onValidPassword',
    'click .close-room': 'onCloseRoom',
    'click .rejoin': 'onRejoin'
  },

  initialize: function () {
    this.listenTo(this.model, 'change:focused', this.onFocusChange);
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

    // disclaimer
    if (data.disclaimer) {
      data.disclaimer = _.escape(data.disclaimer);
    }

    // id
    data.room_id = this.model.get('id');

    // dropdown
    data.dropdown = require('../templates/dropdown-room-actions.html')({
      data: data
    });

    // render
    var html = this.template({data: data});
    this.$el.attr('data-identifier', this.model.get('identifier'));
    this.$el.html(html);
    this.$error = this.$('.error');
    this.$el.hide();

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
  onFocusChange: function () {
    if (this.model.get('focused')) {
      this.$el.show();
      this.$error.hide();
      this.hasBeenFocused = true;
    } else {
      this.$el.hide();
    }
  },
  onRequestAllowance: function (event) {
    event.preventDefault();

    ConfirmationView.open({message: 'request-allowance', area: true}, _.bind(function (message) {
      client.roomJoinRequest(this.model.get('id'), message, function (response) {
        if (response.err) {
          if (response.err === 'allow-pending' || response.err === 'message-wrong-format' || response.err === 'banned' || response.err === 'group-banned' || response.err === 'room-not-found') {
            app.trigger('alert', 'error', i18next.t('chat.allowed.error.' + response.err));
          } else {
            app.trigger('alert', 'error', i18next.t('global.unknownerror'));
          }
        } else {
          app.trigger('alert', 'info', i18next.t('chat.allowed.success'));
        }
      });
    }, this));
  },
  onValidPassword: function (event) {
    var that = this;
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
    client.roomJoin(this.model.get('id'), password, function (response) {
      if (!response.err) {
        return;
      }

      that.$error.show();
      if (response.err === 'wrong-password' || response.err === 'spam-password') {
        that.$error.text(i18next.t('chat.password.' + response.err));
      } else if (response.err) {
        that.$error.text(i18next.t('chat.password.error'));
      }
    });
  },
  onRejoin: function (event) {
    client.roomJoin(this.model.get('id'), null, function (response) {
      if (response.err) {
        app.trigger('alert', 'error', i18next.t('global.unknownerror'));
      }
    });
  },
  onCloseRoom: function (event) {
    event.preventDefault();
    client.roomLeaveBlock(this.model.get('id'));
  },
  initializeTooltips: function () {
    this.$el.find('[data-toggle="tooltip"]').tooltip({
      container: 'body'
    });
  }
});

module.exports = RoomBlockedView;
