var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var i18next = require('i18next-client');
var client = require('../libs/client');
var currentUser = require('../models/current-user');

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
    this.$spinner = this.$('.spinner');
    this.$spinner.html(require('../templates/spinner.html'));
    this.$errorLabel = this.$('.error-label');
    this.$success = this.$('.success');
    this.$input = this.$('.email-sub');
    this.$mailUserLabel = this.$('.email-user');

    this.$form.hide();
    this.$spinner.hide();
    this.$success.hide();

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
  },

  onCancel: function (event) {
    event.preventDefault();

    this.$form.hide();
    this.$link.show();
    this.$errorLabel.text('');
    this.$form.removeClass('has-error');
    this.$input.val((this.user.account && this.user.account.email) ?
      this.user.account.email :
      '');
  },

  onSubmit: function (event) {
    event.preventDefault();

    var that = this;

    if (this.$input.val().length < 1) {
      this.putError('empty');
      return;
    }

    this.$errorLabel.text('');
    this.$spinner.show();
    this.$form.removeClass('has-error');

    client.accountEmail(this.$input.val(), function (data) {
      that.$spinner.hide();
      if (data.err) {
        return that.putError(data.err);
      }

      that.$mailUserLabel.text(that.$input.val());
      that.$form.hide();
      that.$success.show();
      that.$link.text(i18next.t('global.change'));
    });
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
  }

});


module.exports = DrawerAccountEmailView;