var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var i18next = require('i18next-client');
var app = require('../libs/app');
var confirmationView = require('./modal-confirmation');

var DrawerAccountManageEmailsView = Backbone.View.extend({
  template: require('../templates/drawer-account-manage-emails.html'),

  events: {
    'change .savable': 'onChangeMainEmail',
    'click .add-email': 'onAddEmail',
    'click .delete-email': 'onDeleteEmail',
    'click .send-validation-email': 'onSendValidationEmail'
  },

  initialize: function (options) {
    this.user = options.user;

    this.render();
  },

  render: function () {
    this.$el.html(this.template({emails: this.user.account.emails}));

    this.$errorLabel = this.$('.error-label');
    this.$success = this.$('.success');
    this.$error = this.$('.error');
    this.$submit = this.$('.add-email');

    this.reset();

    this.initializeTooltips();
    return this;
  },

  reset: function () {
    this.$error.hide();
    this.$success.hide();
    this.$submit.removeClass('loading');
  },

  putError: function (err) {
    this.$errorLabel.text(i18next.t('account.manageemail.errors.' + err, {defaultValue: i18next.t('global.unknownerror')}));
    this.$error.show();
  },

  showSuccess: function () {
    this.$success.show();
    setTimeout(_.bind(function () {
      this.$success.fadeOut();
    }, this), 2000);
  },

  onChangeMainEmail: function (event) {
    var $target = $(event.currentTarget);
    var email = $target.data('email');
    $target.prop('checked', false);

    confirmationView.open({
      message: 'change-email',
      email: email
    }, _.bind(function () {
      app.client.accountEmail(email, 'main', _.bind(function (d) {
        this.reset();
        if (d.err) {
          return this.putError(d.err);
        }

        _.each(this.user.account.emails, function (e) {
          e.main = (e.email === email);
        });
        this.render();
      }, this));
    }, this), _.bind(function () {
      this.render();
    }, this));
  },

  onAddEmail: function () {
    confirmationView.open({
      message: 'add-email',
      input: true
    }, _.bind(function (email) {
      this.$submit.addClass('loading');
      app.client.accountEmail(email, 'add', _.bind(function (response) {
        this.reset();
        if (response.err) {
          return this.putError(response.err);
        }

        this.user.account.emails.push({email: email, confirmed: false});
        this.render();
        this.showSuccess();
      }, this));
    }, this));
  },

  onDeleteEmail: function (event) {
    var email = $(event.currentTarget).data('email');

    confirmationView.open({
      message: 'delete-email',
      email: email
    }, _.bind(function () {
      app.client.accountEmail(email, 'delete', _.bind(function (response) {
        this.reset();
        if (response.err) {
          return this.putError(response.err);
        }

        var emails = [];
        _.each(this.user.account.emails, function (e) {
          if (e.email !== email) {
            emails.push(e);
          }
        });
        this.user.account.emails = emails;
        this.render();
      }, this));
    }, this));
  },

  onSendValidationEmail: function (event) {
    var email = $(event.currentTarget).data('email');

    confirmationView.open({
      message: 'send-email',
      email: email
    }, _.bind(function () {
      app.client.accountEmail(email, 'validate', _.bind(function (response) {
        this.reset();
        if (response.err) {
          return this.putError(response.err);
        }
      }, this));
    }, this));
  },

  initializeTooltips: function () {
    this.$el.find('[data-toggle="tooltip"]').tooltip({
      container: 'body'
    });
  }
});

module.exports = DrawerAccountManageEmailsView;
