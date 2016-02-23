var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var common = require('@dbrugne/donut-common/browser');
var app = require('../libs/app');
var ConfirmationView = require('./modal-confirmation');
var TableView = require('./drawer-group-access-table');
var i18next = require('i18next-client');
var DropdownUsersView = require('./dropdown-users');

var GroupAccessView = Backbone.View.extend({

  template: require('../templates/drawer-group-users-allowed.html'),

  id: 'group-users-allowed',

  events: {},

  initialize: function (options) {
    this.model = options.model;
    this.render();
    this.reload();
  },
  render: function () {
    this.$el.html(require('../templates/spinner.html'));
    return this;
  },
  reload: function () {
    var what = {
      users: true,
      admin: true
    };
    app.client.groupRead(this.model.get('id'), what, _.bind(function (data) {
      if (!data.err) {
        this.onResponse(data);
      }
    }, this));
  },
  onResponse: function (data) {
    var html = this.template({
      identifier: data.name
    });
    this.$el.html(html);

    this.dropdownUsersView = new DropdownUsersView({
      el: this.$('.search-ctn')
    });

    this.listenTo(this.dropdownUsersView, 'onSearch', this.onSearch);
    this.listenTo(this.dropdownUsersView, 'onClickLi', this.onAllowUser);

    this.$errors = this.$('.error');

    this.tablePending = new TableView({
      el: this.$('.allow-pending'),
      group_id: this.model.get('group_id'),
      model: this.model
    });
    this.tableAllowed = new TableView({
      el: this.$('.allowed'),
      model: this.model
    });

    this.listenTo(app, 'redraw-tables', this.renderTables);

    this.renderTables();

    this.listenTo(this.tablePending, 'error', this.setError);
    this.listenTo(this.tableAllowed, 'error', this.setError);

    this.initializeTooltips();
  },
  renderTables: function () {
    this.tablePending.render('pending');
    this.tableAllowed.render('allowed');
  },
  _remove: function () {
    this.tablePending.remove();
    this.tableAllowed.remove();
    this.remove();
  },
  onSearch: function (val) {
    this.dropdownUsersView.open();

    var options = {
      users: true,
      limit: {users: 15}
    };
    app.client.search(val, options, _.bind(function (data) {
      _.each(data.users.list, function (element, index, list) {
        list[index].avatarUrl = common.cloudinary.prepare(element.avatar, 50);
      });

      this.dropdownUsersView.onResults(data.users.list);
    }, this));
  },
  onAllowUser: function (event) {
    var userId = $(event.currentTarget).data('userId');
    var userName = $(event.currentTarget).data('username');

    if (userId && userName) {
      ConfirmationView.open({
        message: 'invite',
        username: userName,
        room_name: this.model.get('name')
      }, _.bind(function () {
        app.client.groupAllowedAdd(this.model.get('group_id'), userId, _.bind(function (response) {
          if (response.err) {
            if (response.err === 'already-allowed' || response.err === 'already-member') {
              return this.setError(i18next.t('group.' + response.err, {username: userName}));
            }
            if (response.err === 'group-banned') {
              return this.setError(i18next.t('group.banned', {username: userName}));
            }
            return this.setError(i18next.t('global.unknownerror'));
          }

          this.renderTables();
        }, this));
      }, this));
    }

    this.dropdownUsersView.close();
  },
  reset: function () {
    this.$errors.html('').hide();
    this.$el.removeClass('has-error').removeClass('has-success').val('');
  },
  setError: function (err) {
    if (err === 'unknown') {
      err = i18next.t('global.unknownerror');
    }
    this.$errors.html(err).show();
  },
  initializeTooltips: function () {
    this.$el.find('[data-toggle="tooltip"]').tooltip({
      container: 'body'
    });
  }
});

module.exports = GroupAccessView;
