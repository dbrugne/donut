var _ = require('underscore');
var Backbone = require('backbone');
var i18next = require('i18next-client');
var app = require('../libs/app');

var DrawerAccountEmailView = Backbone.View.extend({
  template: require('../templates/drawer-account-email.html'),

  events: {
    'click #email-modal-link': 'onShowForm',
    'submit .form-mail': 'onSubmit',
    'click .cancel-email': 'onCancel'
  },

  initialize: function (options) {
    this.user = options.user;

    this.render();

    this.$link = this.$('#email-modal-link');
    this.$form = this.$('.form-mail');
    this.$errorLabel = this.$('.error-label');
    this.$success = this.$('.success');
    this.$error = this.$('.error');
    this.$input = this.$('.email-sub');
    this.$mailUserLabel = this.$('.email-user');
    this.$submit = this.$('.submit-email');

    this.$submit.removeClass('loading');
    this.$form.hide();
    this.$success.hide();
    this.$error.hide();

    if (this.user.account && this.user.account.email) {
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
    this.$input.val((this.user.account && this.user.account.email)
      ? this.user.account.email
      : '');
  },

  onSubmit: function (event) {
    event.preventDefault();

    if (this.$input.val().length < 1) {
      this.putError('empty');
      return;
    }

    this.$errorLabel.text('');
    this.$submit.addClass('loading');
    this.$form.removeClass('has-error');

    app.client.accountEmail(this.$input.val(), 'main', _.bind(function (data) {
      this.$submit.removeClass('loading');
      if (data.err) {
        return this.putError(data.err);
      }

      this.$mailUserLabel.text(this.$input.val());
      this.$form.hide();
      this.$success.show();
      this.$error.hide();
      this.$link.text(i18next.t('global.change'));
      this.$link.show();
    }, this));
  },

  putError: function (error) {
    this.$form.addClass('has-error');

    if (error === 'wrong-format') {
      this.$errorLabel.text(i18next.t('account.email.error.format'));
    } else if (error === 'same-mail') {
      this.$errorLabel.text(i18next.t('account.email.error.alreadyyours'));
    } else if (error === 'mail-already-exist') {
      this.$errorLabel.text(i18next.t('account.email.error.alreadyexists'));
    } else {
      this.$errorLabel.text(i18next.t('global.unknownerror'));
    }
    this.$error.show();
  }

});

module.exports = DrawerAccountEmailView;
