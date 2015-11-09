var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var i18next = require('i18next-client');
var client = require('../libs/client');
var confirmationView = require('./modal-confirmation');

var DrawerAccountManageEmailsView = Backbone.View.extend({
  template: require('../templates/drawer-account-manage-emails.html'),

  events: {
    'change .savable': 'onChangeMainEmail',
    'click .add-email': 'onAddEmail',
    'click .delete-email': 'onDeleteEmail'
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

    this.$error.hide();
    this.$success.hide();

    this.initializeTooltips();
    return this;
  },

  putError: function () {
    this.$errorLabel.text(i18next.t('global.unknownerror'));
    this.$error.show();
  },

  onChangeMainEmail: function (event) {
    var $target = $(event.currentTarget);
    var email = $target.data('email');

    client.userUpdate({email: email}, _.bind(function (d) {
      if (d.err) {
        return this.putError();
      }

      _.each(this.user.account.emails, function (e) {
        e.main = (e.email === email);
      });
      this.render();
    }, this));
  },

  onAddEmail: function (event) {
    confirmationView.open({message: 'add-email', input: true}, _.bind(function (email) {
      // add email
    }, this));
  },

  onDeleteEmail: function (event) {
    confirmationView.open({}, _.bind(function (email) {
      // delete email
    }, this));
  },

  initializeTooltips: function () {
    this.$el.find('[data-toggle="tooltip"]').tooltip({
      container: 'body'
    });
  }

});

module.exports = DrawerAccountManageEmailsView;
