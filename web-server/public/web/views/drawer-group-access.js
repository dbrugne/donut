var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var keyboard = require('../libs/keyboard');
var common = require('@dbrugne/donut-common/browser');
var app = require('../libs/app');
var client = require('../libs/client');
var ConfirmationView = require('./modal-confirmation');
var TableView = require('./drawer-group-access-table');
var i18next = require('i18next-client');
var currentUser = require('../models/current-user');

var GroupAccessView = Backbone.View.extend({

  template: require('../templates/drawer-group-access.html'),

  dropdownTemplate: require('../templates/drawer-room-access-dropdown.html'),

  passwordPattern: /(.{4,255})$/i,

  id: 'group-access',

  timeBufferBeforeSearch: 1000,

  timeout: 0,

  events: {
    'keyup #input-search': 'onSearchUser',
    'click .search-user i.icon-search': 'onSearchUser',
    'click .search-user .dropdown-menu>li': 'onAllowUser',

    'keyup #input-search-banned': 'onSearchUserBanned',
    'click .search-user-banned i.icon-search': 'onSearchUserBanned',
    'click .search-user-banned .dropdown-menu>li': 'onBanUser',

    'click input.save-access': 'onSubmit',
    'click input.save-conditions': 'onSubmitConditions',
    'change [type="checkbox"]': 'onChoosePassword',
    'click .random-password': 'onRandomPassword',
    'keyup #conditions-area': 'onTypeConditions'
  },

  initialize: function (options) {
    this.model = options.model;

    this.render();
  },
  render: function () {
    var what = {
      more: true,
      users: true,
      admin: true
    };
    client.groupRead(this.model.get('id'), what, _.bind(function (data) {
      if (!data.err) {
        this.onResponse(data);
      }
    }, this));
    return this;
  },
  onResponse: function (data) {
    data.isOwner = (data.owner_id === currentUser.get('user_id'));
    data.isAdmin = currentUser.isAdmin();
    data.isOp = !!_.find(data.members, function (item) {
      return (item.user_id === currentUser.get('user_id') && item.is_op === true);
    });

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
    this.$searchBan = this.$('#input-search-banned');
    this.$dropdown = this.$('.search-user .dropdown');
    this.$dropdownBan = this.$('.search-user-banned .dropdown');

    this.$toggleCheckbox = this.$('#input-password-checkbox');
    this.$checkboxGroupAllow = this.$('#input-allowgroupmember-checkbox');
    this.$password = this.$('.input-password');
    this.$randomPassword = this.$('.random-password');
    this.$countConditions = this.$('.counter');
    this.$conditions = this.$('#conditions-area');

    if (data.disclaimer) {
      this.$conditions.html(data.disclaimer);
      this.onTypeConditions();
    }

    this.tablePending = new TableView({
      el: this.$('.allow-pending'),
      group_id: this.model.get('group_id'),
      model: this.model
    });
    this.tableAllowed = new TableView({
      el: this.$('.allowed'),
      model: this.model
    });
    this.renderTables();

    this.initializeTooltips();
  },
  renderTables: function () {
    this.tablePending.render('pending');
    this.tableAllowed.render('allowed');
  },
  renderPendingTable: function () {
    this.tablePending.render('pending');
  },
  renderDropDown: function (val, dropdown) {
    this.$dropdown.removeClass('open');
    this.$dropdownBan.removeClass('open');

    dropdown.addClass('open');
    var dropdownMenu = dropdown.find('.dropdown-menu');
    dropdownMenu.html(require('../templates/spinner.html'));

    var that = this;
    client.search(val, false, true, false, 15, 0, false, false, function (data) {
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
    this.remove();
  },
  onSearchUser: function (event) {
    event.preventDefault();
    var key = keyboard._getLastKeyCode(event);
    if (key.key === keyboard.ESC && this.$dropdown.hasClass('open')) {
      event.preventDefault();
      event.stopPropagation();
      this.resetDropdown();
    }

    var val = this.$search.val();

    clearTimeout(this.timeout);

    if (val === '') {
      this.$dropdown.removeClass('open');
      return;
    }

    if (event.type === 'click' || key.key === keyboard.RETURN) { // instant search when user click on icon or press enter
      this.renderDropDown(val, this.$dropdown);
      return;
    }

    this.timeout = setTimeout(_.bind(function () {
      this.renderDropDown(val, this.$dropdown);
    }, this), this.timeBufferBeforeSearch);
  },
  onSearchUserBanned: function (event) {
    event.preventDefault();
    var key = keyboard._getLastKeyCode(event);
    if (key.key === keyboard.ESC && this.$dropdownBan.hasClass('open')) {
      event.preventDefault();
      event.stopPropagation();
      this.resetDropdownBan();
    }

    var val = this.$searchBan.val();

    if (val === '') {
      this.$dropdownBan.removeClass('open');
      return;
    }

    this.renderDropDown(val, this.$dropdownBan);
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
        client.groupAllow(this.model.get('group_id'), userId, _.bind(function () {
          this.tablePending.render('pending');
          this.tableAllowed.render('allowed');
          this.model.refreshUsers();
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
        input: true,
        message: 'ban-group-user',
        username: userName
      }, _.bind(function (reason) {
        client.groupBan(this.model.get('group_id'), userId, reason, _.bind(function (response) {
          if (response.err) {
            return this.setError(i18next.t('chat.form.errors.' + response.err, {defaultValue: i18next.t('global.unknownerror')}));
          }

          this.tablePending.render('pending');
          this.tableAllowed.render('allowed');
          this.model.refreshUsers();
        }, this));
      }, this));
    }

    // Close dropdown
    this.$dropdownBan.removeClass('open');
    this.$searchBan.val('');
  },
  resetDropdown: function () {
    this.$dropdown.removeClass('open');
  },
  resetDropdownBan: function () {
    this.$dropdownBan.removeClass('open');
  },
  onChoosePassword: function (event) {
    // Display block on click
    if (this.$toggleCheckbox.is(':checked')) {
      this.$password.removeAttr('disabled').removeClass('disabled');
      this.$randomPassword.removeClass('disabled');
      if (this.$password.val() === '' && !this.currentPassword) {
        this.$password.val(common.misc.randomString());
      } else {
        this.$password.val(this.currentPassword);
      }
    } else {
      this.$password.attr('disabled', true).addClass('disabled');
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
  setError: function (err) {
    if (err === 'unknown') {
      err = i18next.t('global.unknownerror');
    }
    this.$errors.html(err).show();
  },
  onSubmit: function (event) {
    this.reset();

    // password
    if (!this.isValidPassword()) {
      return this.setError(i18next.t('chat.form.errors.invalid-password'));
    }

    client.groupUpdate(this.model.get('group_id'), {password: this.getPassword()}, _.bind(function (data) {
      if (data.err) {
        return this.setError(i18next.t('chat.form.errors.' + data.err, {defaultValue: i18next.t('global.unknownerror')}));
      }
      this.trigger('close');
    }, this));
  },
  onTypeConditions: function (event) {
    this.$countConditions.html(i18next.t('chat.form.common.edit.left', {count: 200 - this.$conditions.val().length}));
  },
  onSubmitConditions: function (event) {
    this.reset();

    client.groupUpdate(this.model.get('group_id'), {disclaimer: this.$conditions.val()}, _.bind(function (data) {
      if (data.err) {
        return this.setError(i18next.t('chat.form.errors.' + data.err, {defaultValue: i18next.t('global.unknownerror')}));
      }
      this.trigger('close');
    }, this));
  },
  isValidPassword: function () {
    return (!this.$toggleCheckbox.is(':checked') || (this.$toggleCheckbox.is(':checked') && this.passwordPattern.test(this.getPassword())));
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

module.exports = GroupAccessView;
