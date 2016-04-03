var _ = require('underscore');
var Backbone = require('backbone');
var i18next = require('i18next-client');
var common = require('@dbrugne/donut-common/browser');
var app = require('../libs/app');
var ConfirmationView = require('./modal-confirmation');

var RoomAccessView = Backbone.View.extend({

  template: require('../templates/drawer-room-access.html'),

  passwordPattern: /(.{4,255})$/i,

  id: 'room-access',

  events: {
    'click .save-password': 'onSubmit',
    'click .save-conditions': 'onSubmitConditions',
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
    app.client.roomRead(this.roomId, what, _.bind(function (data) {
      if (!data.err) {
        this.onResponse(data);
      }
    }, this));
  },
  onResponse: function (data) {
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

    this.$errors = this.$('.error');
    this.$success = this.$('.success');

    this.$search = this.$('input[type=text]');
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

    this.initializeTooltips();
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
      app.client.roomSetPrivate(that.roomId, function (response) {
        if (!response.err) {
          that.reload();
        }
      });
    });
  },
  onChangeGroupAllow: function (event) {
    var update = (this.$checkboxGroupAllow.is(':checked'))
      ? { allow_group_member: true }
      : { allow_group_member: false, add_users_to_allow: true };

    app.client.roomUpdate(this.roomId, update, _.bind(function (response) {
      this.reset();
      if (response.err) {
        this.setError(response.err);
      } else {
        return this.setSuccess(i18next.t('chat.form.success.set-access'));
      }
    }, this));
  },
  onChangeUsersRequest: function (event) {
    app.client.roomUpdate(this.roomId, {
      allow_user_request: this.$checkboxUserRequest.is(':checked')
    }, _.bind(function (response) {
      this.reset();
      if (response.err) {
        this.setError(response.err);
      } else {
        return this.setSuccess(i18next.t('chat.form.success.set-access'));
      }
    }, this));
  },
  reset: function () {
    this.$errors.html('').hide();
    this.$success.html('').hide();
    this.$el.removeClass('has-error').removeClass('has-success').val('');
  },
  setError: function (err) {
    if (err === 'unknown') {
      err = i18next.t('global.unknownerror');
    }
    this.$errors.html(err).show();
  },
  setSuccess: function (message) {
    if (!message) {
      return;
    }
    this.$success.html(message).show();
  },
  onSubmit: function (event) {
    this.reset();

    // password
    if (!this.isValidPassword()) {
      return this.setError(i18next.t('chat.form.errors.invalid-password'));
    }

    app.client.roomUpdate(this.roomId, {password: this.getPassword()}, _.bind(function (data) {
      this.reset();
      if (data.err) {
        return this.setError(i18next.t('chat.form.errors.' + data.err, {defaultValue: i18next.t('global.unknownerror')}));
      } else {
        return this.setSuccess(i18next.t('chat.form.success.set-password'));
      }
    }, this));
  },
  onSubmitConditions: function (event) {
    app.client.roomUpdate(this.roomId, {disclaimer: this.$conditions.val()}, _.bind(function (data) {
      this.reset();
      if (data.err) {
        return this.setError(i18next.t('chat.form.errors.' + data.err, {defaultValue: i18next.t('global.unknownerror')}));
      } else {
        return this.setSuccess(i18next.t('chat.form.success.set-access'));
      }
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
