var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var keyboard = require('../libs/keyboard');
var i18next = require('i18next-client');
var common = require('@dbrugne/donut-common/browser');
var app = require('../libs/app');
var client = require('../libs/client');
var ConfirmationView = require('./modal-confirmation');
var TableView = require('./drawer-room-access-table');

var RoomAccessView = Backbone.View.extend({

  template: require('../templates/drawer-room-access.html'),

  dropdownTemplate: require('../templates/drawer-room-access-dropdown.html'),

  passwordPattern: /(.{4,255})$/i,

  id: 'room-access',

  timeBufferBeforeSearch: 1000,

  timeout: 0,

  events: {
    'keyup input[type=text]': 'onSearch',
    'click input.save-password': 'onSubmit',
    'click input.save-conditions': 'onSubmitConditions',
    'click i.icon-search': 'onSearch',
    'click .dropdown-menu>li': 'onAllowUser',
    'change [type="checkbox"]': 'onChoosePassword',
    'click .random-password': 'onRandomPassword',
    'click .change-mode': 'onChangeMode',
    'click #input-allowgroupmember-checkbox': 'onChangeGroupAllow',
    'click #input-userrequest-checkbox': 'onChangeUsersRequest',
    'input #conditions-area': 'onTypeConditions'
  },

  initialize: function (options) {
    this.roomId = options.room_id;
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
      users: false,
      admin: true
    };
    client.roomRead(this.roomId, what, _.bind(function (data) {
      if (!data.err) {
        this.onResponse(data);
      }
    }, this));
  },
  onResponse: function (data) {
    this.listenTo(app, 'redraw-tables', this.renderTables);

    this.currentPassword = data.password;
    this.room_name = data.name;

    var html = this.template({
      room: data,
      mode: data.mode,
      password: data.password,
      group: data.group_id || false,
      allow_group_member: data.allow_group_member || false,
      allow_user_request: data.allow_user_request || false
    });
    this.$el.html(html);

    this.$errors = this.$('.errors');
    this.$search = this.$('input[type=text]');
    this.$dropdown = this.$('.dropdown');
    this.$dropdownMenu = this.$('.dropdown-menu');
    this.$toggleCheckbox = this.$('#input-password-checkbox');
    this.$checkboxGroupAllow = this.$('#input-allowgroupmember-checkbox');
    this.$checkboxUserRequest = this.$('#input-userrequest-checkbox');
    this.$password = this.$('.input-password');
    this.$randomPassword = this.$('.random-password');
    this.$countConditions = this.$('.counter');
    this.$conditions = this.$('#conditions-area');

    if (data.disclaimer) {
      this.$conditions.html(_.escape(data.disclaimer));
      this.onTypeConditions();
    }

    // Only render tables if the donut is private
    if (data.mode === 'private') {
      this.tablePending = new TableView({
        el: this.$('.allow-pending'),
        room_id: this.roomId
      });
      this.tableAllowed = new TableView({
        el: this.$('.allowed'),
        room_id: this.roomId
      });
      this.renderTables();
    }

    this.initializeTooltips();
  },
  renderTables: function () {
    this.tablePending.render('pending');
    this.tableAllowed.render('allowed');
  },
  renderPendingTable: function () {
    this.tablePending.render('pending');
  },
  renderDropDown: function () {
    this.$dropdown.addClass('open');
    this.$dropdownMenu.html(require('../templates/spinner.html'));

    var that = this;
    var options = {
      users: true,
      limit: {
        users: 15
      }
    };
    client.search(this.$search.val(), options, function (data) {
      _.each(data.users.list, function (element, index, list) {
        list[index].avatarUrl = common.cloudinary.prepare(element.avatar, 20);
      });

      that.$dropdownMenu.html(that.dropdownTemplate({users: data.users.list}));
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
  onSearch: function (event) {
    event.preventDefault();

    clearTimeout(this.timeout);

    if (this.$search.val() === '') {
      this.$dropdown.removeClass('open');
      return;
    }
    var key = keyboard._getLastKeyCode(event);
    if (event.type === 'click' || key.key === keyboard.RETURN) { // instant search when user click on icon or press enter
      this.renderDropDown();
      return;
    }

    this.timeout = setTimeout(_.bind(function () {
      this.renderDropDown();
    }, this), this.timeBufferBeforeSearch);
  },
  onAllowUser: function (event) {
    event.preventDefault();

    var userId = $(event.currentTarget).data('userId');
    var userName = $(event.currentTarget).data('username');

    if (userId && userName) {
      ConfirmationView.open({message: 'invite', username: userName, room_name: this.room_name}, _.bind(function () {
        client.roomAllow(this.roomId, userId, _.bind(function () {
          this.renderTables();
        }, this));
      }, this));
    }

    // Close dropdown
    this.$dropdown.removeClass('open');
    this.$search.val('');
  },
  // Chen the user clicks on the password checkbox
  onChoosePassword: function (event) {
    if (this.$toggleCheckbox.is(':checked')) { // now checkbox is checked
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
  onChangeMode: function (event) {
    event.preventDefault();
    var that = this;
    ConfirmationView.open({message: 'mode-change'}, function () {
      client.roomSetPrivate(that.roomId, function (response) {
        if (!response.err) {
          that.reload();
        }
      });
    });
  },
  onChangeGroupAllow: function (event) {
    if (this.$checkboxGroupAllow.is(':checked')) {
      client.roomUpdate(this.roomId, { allow_group_member: true }, function (err) {
        return (err);
      });
    } else {
      client.roomUpdate(this.roomId, { allow_group_member: false, add_users_to_allow: true }, function (err) {
        return (err);
      });
    }
  },
  onChangeUsersRequest: function (event) {
    if (this.$checkboxUserRequest.is(':checked')) {
      client.roomUpdate(this.roomId, { allow_user_request: true }, function (err) {
        return (err);
      });
    } else {
      client.roomUpdate(this.roomId, { allow_user_request: false }, function (err) {
        return (err);
      });
    }
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

    client.roomUpdate(this.roomId, {password: this.getPassword()}, _.bind(function (data) {
      if (data.err) {
        return this.setError(i18next.t('chat.form.errors.' + data.err, {defaultValue: i18next.t('global.unknownerror')}));
      }
      this.trigger('close');
    }, this));
  },
  onSubmitConditions: function (event) {
    this.reset();

    client.roomUpdate(this.roomId, {disclaimer: this.$conditions.val()}, _.bind(function (data) {
      if (data.err) {
        return this.setError(i18next.t('chat.form.errors.' + data.err, {defaultValue: i18next.t('global.unknownerror')}));
      }
      this.trigger('close');
    }, this));
  },
  onTypeConditions: function (event) {
    this.$countConditions.html(i18next.t('chat.form.common.edit.left', {count: 200 - this.$conditions.val().length}));
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

module.exports = RoomAccessView;
