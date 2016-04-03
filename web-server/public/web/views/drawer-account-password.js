var _ = require('underscore');
var Backbone = require('backbone');
var i18next = require('i18next-client');
var app = require('../libs/app');

var DrawerAccountPasswordView = Backbone.View.extend({
  template: require('../templates/drawer-account-password.html'),

  events: {
    'submit .form-password': 'onSubmit',
    'click .cancel-password': 'onCancel',
    'click #password-modal-link': 'onShowForm'
  },

  initialize: function (options) {
    this.user = options.user;

    this.render();

    this.$link = this.$('#password-modal-link');
    this.$form = this.$('.form-password');
    this.$errorLabel = this.$('.error-label');
    this.$success = this.$('.success');
    this.$error = this.$('.error');
    this.$labelCurrentPassword = this.$('.label-current-password');
    this.$inputCurrentPassword = this.$('.input-current-password');
    this.$inputNewPassword = this.$('.input-new-password');
    this.$inputConfirmPassword = this.$('.input-password-confirm');
    this.$submit = this.$('.submit-password');

    this.$form.hide();
    this.$submit.removeClass('loading');
    this.$success.hide();
    this.$error.hide();

    if (this.user.account && this.user.account.has_password) {
      this.$link.text(i18next.t('global.change'));
    } else {
      this.$link.text(i18next.t('global.add'));
    }
  },

  render: function () {
    this.$el.html(this.template({user: this.user}));
    return this;
  },

  onShowForm: function (event) {
    event.preventDefault();

    if (!this.user.account.has_password) {
      this.$inputCurrentPassword.hide();
      this.$labelCurrentPassword.hide();
    }

    this.$form.show();
    this.$link.hide();
    this.$success.hide();
    this.$error.hide();
  },

  onCancel: function (event) {
    event.preventDefault();

    this.$form.hide();
    this.$link.show();
    this.$errorLabel.text('');
    this.$form.removeClass('has-error');
    this.$inputCurrentPassword.val('');
    this.$inputConfirmPassword.val('');
    this.$inputNewPassword.val('');
    this.$success.hide();
    this.$error.hide();
  },

  onSubmit: function (event) {
    this.$error.hide();
    event.preventDefault();

    if (this.$inputNewPassword.val().length < 6 || this.$inputNewPassword.val().length > 50) {
      this.putError('wrong-format');
      return;
    }

    if (this.$inputNewPassword.val() !== this.$inputConfirmPassword.val()) {
      this.putError('confirm');
      return;
    }

    this.$errorLabel.text('');
    this.$submit.addClass('loading');
    this.$form.removeClass('has-error');

    app.client.accountPassword(this.$inputNewPassword.val(), this.$inputCurrentPassword.val(), _.bind(function (data) {
      this.$submit.removeClass('loading');
      if (data.err) {
        return this.putError(data.err);
      }

      this.$inputCurrentPassword.val('');
      this.$inputConfirmPassword.val('');
      this.$inputNewPassword.val('');
      this.$form.hide();
      this.$success.show();
      this.$error.hide();
      this.$link.show();
      this.$link.text(i18next.t('global.change'));
      this.$link.show();
      this.$inputCurrentPassword.show();
    }, this));
  },

  putError: function (err) {
    this.$form.addClass('has-error');

    if (err === 'wrong-format') {
      this.$errorLabel.text(i18next.t('account.password.error.length'));
    } else if (err === 'confirm') {
      this.$errorLabel.text(i18next.t('account.password.error.confirm'));
    } else if (err === 'wrong-password') {
      this.$errorLabel.text(i18next.t('account.password.error.wrong'));
    } else {
      this.$errorLabel.text(i18next.t('global.unknownerror'));
    }
    this.$error.show();
  }

});

module.exports = DrawerAccountPasswordView;
