var _ = require('underscore');
var Backbone = require('backbone');
var i18next = require('i18next-client');
var app = require('../libs/app');

var ModalJoinRoomView = Backbone.View.extend({
  template: require('../templates/modal-join-room.html'),

  events: {
    'click .confirm-request': 'onSendRequest',
    'click .confirm-password': 'onConfirmPassword'
  },

  initialize: function (options) {
    this.data = options.data;
    this.render();
  },

  render: function () {
    if (this.data.disclaimer) {
      this.data.disclaimer = _.escape(this.data.disclaimer);
    }
    this.$el.html(this.template({data: this.data}));

    // error and success
    this.$error = this.$('.error');
    this.$success = this.$('.success');

    return this;
  },

  onSendRequest: function () {
    this.resetMessage();
    if (!this.data.request) {
      return this.$error.text(i18next.t('global.unknownerror')).show();
    }
    var message = this.$('.input-request').val();

    app.client.roomJoinRequest(this.data.group_id, message, _.bind(function (response) {
      if (response.err) {
        if (response.err === 'already-allowed') {
          app.trigger('askMembership');
          this.trigger('close');
        } else if (response.err === 'allow-pending' || response.err === 'message-wrong-format') {
          this.$error.text(i18next.t('chat.allowed.error.' + response.err)).show();
        } else if (response.err === 'not-confirmed') {
          this.$error.text(i18next.t('chat.form.errors.' + response.err)).show();
        } else {
          this.$error.text(i18next.t('global.unknownerror')).show();
        }
      } else {
        this.$success.text(i18next.t('chat.joingroup.options.request.success')).show();
      }
    }, this));
  },

  onConfirmPassword: function () {
    this.resetMessage();
    var password = this.$('.input-password').val();

    if (!password || !this.data.password) {
      return this.$error.text(i18next.t('chat.joingroup.options.password.error')).show();
    }
    app.client.roomJoin(this.data.group_id, password, _.bind(function (response) {
      if (response.err) {
        if (response.err === 'wrong-password' || response.err === 'params-password') {
          this.$error.text(i18next.t('chat.joingroup.options.password.error')).show();
        } else {
          this.$error.text(i18next.t('global.unknownerror')).show();
        }
      } else if (response.success) {
        app.trigger('joinRoom', {name: this.data.name, popin: false});
        this.trigger('close');
      }
    }, this));
  },

  resetMessage: function () {
    this.$error.hide();
    this.$success.hide();
  }
});

module.exports = ModalJoinRoomView;
