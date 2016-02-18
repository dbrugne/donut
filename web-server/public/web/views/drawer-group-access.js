var _ = require('underscore');
var Backbone = require('backbone');
var common = require('@dbrugne/donut-common/browser');
var app = require('../libs/app');
var TableDomainView = require('./drawer-group-access-domain-table');
var i18next = require('i18next-client');
var currentUser = require('../libs/app').user;

var GroupAccessView = Backbone.View.extend({

  template: require('../templates/drawer-group-access.html'),

  dropdownTemplate: require('../templates/drawer-room-access-dropdown.html'),

  passwordPattern: /(.{4,255})$/i,

  id: 'group-access',

  timeBufferBeforeSearch: 1000,

  timeout: 0,

  events: {
    'click input.save-access': 'onSubmit',
    'click input.save-conditions': 'onSubmitConditions',
    'change [type="checkbox"]': 'onChoosePassword',
    'click .random-password': 'onRandomPassword',
    'keyup #conditions-area': 'onTypeConditions',
    'click #input-userrequest-checkbox': 'onChangeUsersRequest'
  },

  initialize: function (options) {
    this.model = options.model;

    this.render();
  },
  render: function () {
    var what = {
      users: true,
      admin: true
    };
    app.client.groupRead(this.model.get('id'), what, _.bind(function (data) {
      if (!data.err) {
        this.onResponse(data);
      }
    }, this));
    return this;
  },
  onResponse: function (data) {
    data.isOwner = (data.owner_id === currentUser.get('user_id'));
    data.isAdmin = app.user.isAdmin();
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
      password: data.password,
      allow_user_request: data.allow_user_request || false
    });
    this.$el.html(html);

    this.$errors = this.$('.error');

    this.$toggleCheckbox = this.$('#input-password-checkbox');
    this.$checkboxUserRequest = this.$('#input-userrequest-checkbox');
    this.$password = this.$('.input-password');
    this.$randomPassword = this.$('.random-password');
    this.$countConditions = this.$('.counter');
    this.$conditions = this.$('#conditions-area');

    if (data.disclaimer) {
      this.$conditions.html(data.disclaimer);
      this.onTypeConditions();
    }

    if (data.isAdmin || data.isOp || data.isOwner) {
      this.tableDomain = new TableDomainView({
        el: this.$('.domain-allowed'),
        model: this.model
      });
    }
    this.renderTables(data);

    this.listenTo(this.tableDomain, 'error', this.setError);

    this.initializeTooltips();
  },
  renderTables: function (data) {
    if (this.tableDomain) {
      this.tableDomain.render(data);
    }
  },
  _remove: function () {
    if (this.tableDomain) {
      this.tableDomain.remove();
    }
    this.remove();
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
  onChangeUsersRequest: function (event) {
    app.client.groupUpdate(this.model.get('group_id'), {
      allow_user_request: this.$checkboxUserRequest.is(':checked')
    }, _.bind(function (response) {
      if (response.err) {
        this.$errors.html(response.err).show();
      }
    }, this));
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

    app.client.groupUpdate(this.model.get('group_id'), {password: this.getPassword()}, _.bind(function (data) {
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

    app.client.groupUpdate(this.model.get('group_id'), {disclaimer: this.$conditions.val()}, _.bind(function (data) {
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
