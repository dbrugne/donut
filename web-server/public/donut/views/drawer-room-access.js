'use strict';
define([
  'jquery',
  'underscore',
  'backbone',
  'libs/keyboard',
  'i18next',
  'moment',
  'common',
  'models/app',
  'client',
  'views/modal-confirmation',
  'views/drawer-room-access-table',
  '_templates'
], function ($, _, Backbone, keyboard, i18next, moment, common, app, client, ConfirmationView, TableView, templates) {
  var RoomAccessView = Backbone.View.extend({

    template: templates['drawer-room-access.html'],

    dropdownTemplate: templates['drawer-room-access-dropdown.html'],

    passwordPattern: /([^\s]{4,255})$/i,

    id: 'room-access',

    timeBufferBeforeSearch: 1000,

    timeout: 0,

    events: {
      'keyup input[type=text]': 'onSearch',
      'click input.save-access': 'onSubmit',
      'click i.icon-search': 'onSearch',
      'click .dropdown-menu>li': 'onAllowUser',
      'change [type="checkbox"]': 'onChoosePassword',
      'click .random-password': 'onRandomPassword'
    },

    initialize: function (options) {
      this.render();

      var that = this;
      client.roomRead(options.model.get('id'), null, function (data) {
        if (!data.err) {
          that.initialRender(data);
        }
      });
    },
    render: function () {
      // render spinner only
      this.$el.html(templates['spinner.html']);
      return this;
    },
    initialRender: function (room) {
      this.model = room;
      this.listenTo(app, 'redraw-tables', this.renderTables);
      this.listenTo(client, 'room:request', this.renderPendingTable);
      var data = {
        owner_id: this.model.owner.user_id,
        owner_name: this.model.owner.username,
        room_id: this.model.id,
        room_name: this.model.name,
        mode: this.model.mode,
        has_password: this.model.has_password
      };

      var html = this.template(data);
      this.$el.html(html);

      this.$errors = this.$('.errors');
      this.$search = this.$('input[type=text]');
      this.$dropdown = this.$('.dropdown');
      this.$dropdownMenu = this.$('.dropdown-menu');
      this.$toggleCheckbox = this.$('#input-password-checkbox');
      this.$password = this.$('.input-password');
      this.$randomPassword = this.$('.random-password');

      this.tablePending = new TableView({
        el: this.$('.allow-pending'),
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
    renderDropDown: function () {
      this.$dropdown.addClass('open');
      this.$dropdownMenu.html(templates['spinner.html']);

      var that = this;
      client.search(this.$search.val(), false, true, 15, 0, false, function (data) {
        _.each(data.users.list, function (element, index, list) {
          list[index].avatarUrl = common.cloudinarySize(element.avatar, 20);
        });

        that.$dropdownMenu.html(that.dropdownTemplate({users: data.users.list}));
      });
    },
    _remove: function () {
      this.tablePending.remove();
      this.tableAllowed.remove();
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

      if (userId) {
        ConfirmationView.open({}, _.bind(function () {
          client.roomAllow(this.model.id, userId, false, _.bind(function () {
            this.renderTables();
          }, this));
        }, this));
      }

      // Close dropdown
      this.$dropdown.removeClass('open');
      this.$search.val('');
    },
    onChoosePassword: function (event) {
      // Display block on click
      if (this.$toggleCheckbox.is(':checked')) {
        this.$password.removeAttr('disabled').removeClass('disabled');
        this.$randomPassword.removeClass('disabled');
        if (this.$password.val() === '') {
          this.$password.val(common.randomString());
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
      this.$password.val(common.randomString());
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

      client.roomUpdate(this.model.id, { password: this.getPassword() }, _.bind(function (data) {
        if (data.err) {
          return this.editError(data);
        }
        this.trigger('close');
      }, this));
    },
    isValidPassword: function () {
      return (!this.$toggleCheckbox.is(':checked') || (this.$toggleCheckbox.is(':checked') && this.model.has_password && this.getPassword() === '') || (this.$toggleCheckbox.is(':checked') && this.passwordPattern.test(this.getPassword())));
    },
    getPassword: function () {
      if (this.$toggleCheckbox.is(':checked')) {
        return this.$password.val();
      }

      return null;
    },
    editError: function (dataErrors) {
      var message = '';
      _.each(dataErrors.err, function (error) {
        message += i18next.t('chat.form.errors.' + error) + '<br>';
      });
      this.$errors.html(message).show();
    },

    initializeTooltips: function () {
      this.$('[data-toggle="tooltip"]').tooltip();
    }

  });

  return RoomAccessView;
});
