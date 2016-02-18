var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var i18next = require('i18next-client');
var common = require('@dbrugne/donut-common/browser');
var app = require('../libs/app');
var ConfirmationView = require('./modal-confirmation');
var TableView = require('./drawer-room-access-table');
var DropdownUsersView = require('./dropdown-users');

var RoomAccessView = Backbone.View.extend({

  template: require('../templates/drawer-room-users-allowed.html'),

  id: 'room-users-allowed',

  events: {},

  initialize: function (options) {
    this.roomId = options.room_id;
    this.render();
    this.reload();
  },
  render: function () {
    this.$el.html(require('../templates/spinner.html'));
    return this;
  },
  reload: function () {
    var what = {
      more: true,
      users: false,
      admin: true
    };
    app.client.roomRead(this.roomId, what, _.bind(function (data) {
      if (!data.err) {
        this.onResponse(data);
      }
    }, this));
  },
  onResponse: function (data) {
    this.room_name = data.name;

    var html = this.template({
      identifier: data.identifier
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
      room_id: this.roomId
    });
    this.tableAllowed = new TableView({
      el: this.$('.allowed'),
      room_id: this.roomId
    });

    this.listenTo(app, 'redraw-tables', this.renderTables);

    this.renderTables();
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
        list[index].avatarUrl = common.cloudinary.prepare(element.avatar, 20);
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
        room_name: this.room_name
      }, _.bind(function () {
        app.client.roomInvite(this.roomId, userId, _.bind(function (response) {
          if (response.err === 'allow-pending') {
            this.setError(i18next.t('chat.allowed.error.in-pending'));
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

module.exports = RoomAccessView;
