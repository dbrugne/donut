var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var keyboard = require('../libs/keyboard');
var common = require('@dbrugne/donut-common/browser');
var app = require('../models/app');
var client = require('../libs/client');
var ConfirmationView = require('./modal-confirmation');
var TableView = require('./drawer-group-access-table');
var i18next = require('i18next-client');

var RoomAccessView = Backbone.View.extend({

  template: require('../templates/drawer-group-access.html'),

  dropdownTemplate: require('../templates/drawer-room-access-dropdown.html'),

  passwordPattern: /(.{4,255})$/i,

  id: 'group-access',

  timeBufferBeforeSearch: 1000,

  timeout: {
    user: 0,
    ban: 0
  },

  events: {
    'keyup #input-search': 'onSearchUser',
    'click .search-user i.icon-search': 'onSearchUser',
    'click .search-user .dropdown-menu>li': 'onAllowUser',

    'keyup #input-search-ban': 'onSearchBan',
    'click .search-ban i.icon-search': 'onSearchBan',
    'click .search-ban .dropdown-menu>li': 'onBanUser',

    'click input.save-access': 'onSubmit',
    'click input.save-conditions': 'onSubmitConditions',
    'change [type="checkbox"]': 'onChoosePassword',
    'click .random-password': 'onRandomPassword',
    'keyup #conditions-area': 'onTypeConditions'
  },

  initialize: function (options) {
    this.groupId = options.group_id;
    this.render();

    this.reload();
  },
  render: function () {
    // render spinner only
    this.$el.html(require('../templates/spinner.html'));
    return this;
  },
  reload: function () {
    var what = {
      more: true,
      users: true,
      admin: true
    };
    client.groupRead(this.groupId, what, _.bind(function (data) {
      if (!data.err) {
        this.onResponse(data);
      }
    }, this));
  },
  onResponse: function (data) {
    this.model = data;
    this.listenTo(app, 'redraw-tables', this.renderTables);

    this.currentPassword = data.password;
    this.group_name = data.name;

    if (data.disclaimer) {
      data.disclaimer = _.escape(data.disclaimer);
    }
    var html = this.template({
      group: data,
      password: data.password
    });
    this.$el.html(html);

    this.$errors = this.$('.errors');

    this.$search = this.$('#input-search');
    this.$dropdown = this.$('.search-user .dropdown');

    this.$searchBan = this.$('#input-search-ban');
    this.$dropdownBan = this.$('.search-ban .dropdown');

    this.$toggleCheckbox = this.$('#input-password-checkbox');
    this.$checkboxGroupAllow = this.$('#input-allowgroupmember-checkbox');
    this.$password = this.$('.input-password');
    this.$randomPassword = this.$('.random-password');
    this.$savePassword = this.$('.save-access');
    this.$countConditions = this.$('.counter');
    this.$conditions = this.$('#conditions-area');

    if (data.disclaimer) {
      this.$conditions.html(data.disclaimer);
      this.onTypeConditions();
    }

    this.tablePending = new TableView({
      el: this.$('.allow-pending'),
      group_id: this.groupId
    });
    this.tableAllowed = new TableView({
      el: this.$('.allowed'),
      group_id: this.groupId
    });
    this.tableBanned = new TableView({
      el: this.$('.banned'),
      group_id: this.groupId
    });
    this.renderTables();

    this.initializeTooltips();
  },
  renderTables: function () {
    this.tablePending.render('pending');
    this.tableAllowed.render('allowed');
    this.tableBanned.render('banned');
  },
  renderPendingTable: function () {
    this.tablePending.render('pending');
  },
  renderDropDown: function (val, dropdown) {
    dropdown.addClass('open');
    var dropdownMenu = dropdown.find('.dropdown-menu');
    dropdownMenu.html(require('../templates/spinner.html'));

    var that = this;
    client.search(val, false, true, false, 15, 0, false, function (data) {
      _.each(data.users.list, function (element, index, list) {
        list[index].avatarUrl = common.cloudinary.prepare(element.avatar, 20);
      });
      dropdownMenu.html(that.dropdownTemplate({users: data.users.list}));
    });
  },
  _remove: function () {
    if (this.tablePending) {
      this.tablePending.remove();
    }
    if (this.tableAllowed) {
      this.tableAllowed.remove();
    }
    if (this.tableBanned) {
      this.tableBanned.remove();
    }
    this.remove();
  },
  onSearchUser: function (event) {
    this.onSearch(event, 'user', this.$search, this.$dropdown);
  },
  onSearchBan: function (event) {
    this.onSearch(event, 'ban', this.$searchBan, this.$dropdownBan);
  },
  onSearch: function (event, type, search, dropdown) {
    event.preventDefault();
    var val = search.val();

    clearTimeout(this.timeout[type]);

    if (val === '') {
      dropdown.removeClass('open');
      return;
    }

    var key = keyboard._getLastKeyCode(event);
    if (event.type === 'click' || key.key === keyboard.RETURN) { // instant search when user click on icon or press enter
      this.renderDropDown(val, dropdown);
      return;
    }

    this.timeout[type] = setTimeout(_.bind(function () {
      this.renderDropDown(val, dropdown);
    }, this), this.timeBufferBeforeSearch);
  },
  onAllowUser: function (event) {
    event.preventDefault();

    var userId = $(event.currentTarget).data('userId');
    var userName = $(event.currentTarget).data('username');

    if (userId && userName) {
      ConfirmationView.open({
        message: 'invite',
        username: userName,
        room_name: this.group_name
      }, _.bind(function () {
        client.groupAllow(this.groupId, userId, _.bind(function () {
          this.tablePending.render('pending');
          this.tableAllowed.render('allowed');
        }, this));
      }, this));
    }

    // Close dropdown
    this.$dropdown.removeClass('open');
    this.$search.val('');
  },
  onBanUser: function (event) {
    event.preventDefault();

    var userId = $(event.currentTarget).data('userId');
    var userName = $(event.currentTarget).data('username');

    if (userId && userName) {
      ConfirmationView.open({
        message: 'ban-group-user',
        username: userName,
        room_name: this.group_name
      }, _.bind(function () {
        client.groupBan(this.groupId, userId, _.bind(function () {
          this.renderTables();
          this.resetSearch();
        }, this));
      }, this));
    }

    // Close dropdown
    this.$dropdown.removeClass('open');
    this.$search.val('');
  },
  resetSearch: function () {
    this.$dropdown.removeClass('open');
    this.$search.val('');
    this.$dropdownBan.removeClass('open');
    this.$searchBan.val('');
  },
  onChoosePassword: function (event) {
    // Display block on click
    if (this.$toggleCheckbox.is(':checked')) {
      this.$password.removeAttr('disabled').removeClass('disabled');
      this.$savePassword.removeAttr('disabled').removeClass('disabled');
      this.$randomPassword.removeClass('disabled');
      if (this.$password.val() === '' && !this.currentPassword) {
        this.$password.val(common.misc.randomString());
      } else {
        this.$password.val(this.currentPassword);
      }
    } else {
      this.$password.attr('disabled', true).addClass('disabled');
      this.$savePassword.attr('disabled', true).addClass('disabled');
      this.$password.val('');
      this.$randomPassword.addClass('disabled');
    }
  },
  onRandomPassword: function (event) {
    event.preventDefault();
    if (this.$randomPassword.hasClass('disabled') === true) {
      return;
    }
    this.$password.val(common.misc.randomString());
    this.$password.focus();
  },
  reset: function () {
    this.$errors.html('').hide();
    this.$el.removeClass('has-error').removeClass('has-success').val('');
  },
  setError: function (error) {
    this.$errors.html(error).show();
  },
  onSubmit: function (event) {
    this.reset();

    // password
    if (!this.isValidPassword()) {
      return this.setError(i18next.t('chat.form.errors.invalid-password'));
    }

    client.groupUpdate(this.groupId, {password: this.getPassword()}, _.bind(function (data) {
      if (data.err) {
        return this.setError(i18next.t('chat.form.errors.' + data.err));
      }
      this.trigger('close');
    }, this));
  },
  onTypeConditions: function (event) {
    this.$countConditions.html(i18next.t('chat.form.common.edit.left', {count: 200 - this.$conditions.val().length}));
  },
  onSubmitConditions: function (event) {
    this.reset();

    client.groupUpdate(this.groupId, {disclaimer: this.$conditions.val()}, _.bind(function (data) {
      if (data.err) {
        return this.setError(i18next.t('chat.form.errors.' + data.err));
      }
      this.trigger('close');
    }, this));
  },
  isValidPassword: function () {
    return (!this.$toggleCheckbox.is(':checked') || (this.$toggleCheckbox.is(':checked') && this.currentPassword && this.getPassword() === '') || (this.$toggleCheckbox.is(':checked') && this.passwordPattern.test(this.getPassword())));
  },
  getPassword: function () {
    if (this.$toggleCheckbox.is(':checked')) {
      return this.$password.val();
    }

    return null;
  },
  initializeTooltips: function () {
    this.$el.find('[data-toggle="tooltip"]').tooltip({
      container: 'body'
    });
  }
});

module.exports = RoomAccessView;
