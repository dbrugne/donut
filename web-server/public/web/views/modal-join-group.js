var _ = require('underscore');
var Backbone = require('backbone');
var i18next = require('i18next-client');
var app = require('../libs/app');

var ModalJoinGroupView = Backbone.View.extend({
  template: require('../templates/modal-join-group.html'),

  events: {
    'click .confirm-request': 'onSendRequest',
    'click .confirm-password': 'onConfirmPassword',
    'click .confirm-email': 'onConfirmEmail'
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

    app.client.groupRequest(this.data.group_id, message, _.bind(function (response) {
      if (response.err) {
        if (response.err === 'already-member' || response.err === 'already-allowed') {
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
    app.client.groupJoin(this.data.group_id, password, _.bind(function (response) {
      if (response.err) {
        if (response.err === 'wrong-password' || response.err === 'params-password') {
          this.$error.text(i18next.t('chat.joingroup.options.password.error')).show();
        } else {
          this.$error.text(i18next.t('global.unknownerror')).show();
        }
      } else if (response.success) {
        app.trigger('joinGroup', {name: this.data.name, popin: false});
        this.trigger('close');
      }
    }, this));
  },

  onConfirmEmail: function () {
    this.resetMessage();
    var selectDomain = this.$('.select-domain').val();
    var mail = this.$('.input-email').val().replace(selectDomain, '') + selectDomain;
    if (!this.data.allowed_domains || !this.data.allowed_domains.length) {
      return this.$error.text(i18next.t('global.unknownerror')).show();
    }

    if (_.indexOf(this.data.allowed_domains, selectDomain) === -1) {
      return this.$error.text(i18next.t('global.unknownerror')).show();
    }

    app.client.accountEmail(mail, 'add', _.bind(function (response) {
      if (response.success) {
        this.$success.html(i18next.t('chat.joingroup.options.email.success', { email: mail })).show();
      } else {
        if (response.err === 'mail-already-exist') {
          this.$error.text(i18next.t('chat.joingroup.options.email.error')).show();
        } else if (response.err === 'wrong-format') {
          this.$error.text(i18next.t('account.email.error.format')).show();
        } else {
          this.$error.text(i18next.t('global.unknownerror')).show();
        }
      }
    }, this));
  },

  resetMessage: function () {
    this.$error.hide();
    this.$success.hide();
  }
});

module.exports = ModalJoinGroupView;
