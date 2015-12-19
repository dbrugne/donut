var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var app = require('../libs/app');
var confirmationView = require('./modal-confirmation');
var i18next = require('i18next-client');

var DrawerGroupAccessDomainTableView = Backbone.View.extend({
  template: require('../templates/drawer-group-access-domain-table.html'),

  events: {
    'click .add-domain': 'onAddDomain',
    'click .delete-domain': 'onDeleteDomain'
  },

  initialize: function (options) {
    this.model = options.model;

    this.$ctn = this.$('.ctn');
  },
  render: function (data) {
    var domains = (data && data.allowed_domains)
      ? data.allowed_domains
      : null;
    this.$ctn.html(this.template({domains: domains}));

    this.data = data;
    this.$error = $('.error-label');

    this.$error.hide();

    this.initializeTooltips();
  },

  onAddDomain: function () {
    confirmationView.open({message: 'add-domain', input: true}, _.bind(function (domain) {
      app.client.groupDomains(this.data.group_id, domain, 'add', _.bind(function (response) {
        if (!response.err) {
          this.data.allowed_domains.push(domain);
          this.render(this.data);
        } else {
          this.setError(response.err);
        }
      }, this));
    }, this));
  },

  onDeleteDomain: function (event) {
    var domain = $(event.currentTarget).data('domain');
    if (!domain) {
      return;
    }

    confirmationView.open({message: 'delete-domain', domain: domain}, _.bind(function () {
      app.client.groupDomains(this.data.group_id, domain, 'delete', _.bind(function (response) {
        if (!response.err) {
          this.data.allowed_domains = _.without(this.data.allowed_domains, domain);
          this.render(this.data);
        } else {
          this.setError(response.err);
        }
      }, this));
    }, this));
  },

  setError: function (err) {
    err = i18next.t('chat.form.errors.' + err, {defaultValue: i18next.t('global.unknownerror')});
    this.$error.html(err).show();
  },

  initializeTooltips: function () {
    this.$el.find('[data-toggle="tooltip"]').tooltip({
      container: 'body'
    });
  }
});

module.exports = DrawerGroupAccessDomainTableView;
