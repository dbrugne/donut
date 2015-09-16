'use strict';
define([
  'jquery',
  'underscore',
  'backbone',
  'i18next',
  'moment',
  'common',
  'models/app',
  'client',
  'views/modal-confirmation',
  'views/drawer-room-access-table',
  'views/drawer-room-create-mode',
  '_templates'
], function ($, _, Backbone, i18next, moment, common, app, client, ConfirmationView, TableView, DrawerRoomCreateModeView, templates) {
  var RoomAccessView = Backbone.View.extend({

    template: templates['drawer-room-access.html'],

    dropdownTemplate: templates['drawer-room-access-dropdown.html'],

    id: 'room-access',

    timeBufferBeforeSearch: 1000,

    timeout: 0,

    currentType: 'allowed',

    types: ['allowed', 'allowedPending'],

    events: {
      'keyup input[type=text]': 'onSearch',
      'click i.icon-search': 'onSearch',
      'click .dropdown-menu>li': 'onAllowUser'
    },

    initialize: function (options) {
      this.model = options.model;

      this.listenTo(this.model, 'redraw-tables', this.renderTables);

      this.initialRender();
    },
    initialRender: function () {
      var data = {
        owner_id: this.model.get('owner').get('user_id'),
        owner_name: this.model.get('owner').get('username'),
        room_id: this.model.get('id'),
        room_name: this.model.get('name'),
        join_mode: this.model.get('join_mode'),
        has_password: this.model.get('hasPassword'),
        types: this.types
      };

      var html = this.template(data);
      this.$el.html(html);

      this.search = this.$el.find('input[type=text]');
      this.dropdown = this.$el.find('.dropdown');
      this.dropdownMenu = this.$el.find('.dropdown-menu');
      this.tablePending = new TableView({
        el: this.$el.find('#table-allow-pending'),
        model: this.model
      });
      this.tableAllowed = new TableView({
        el: this.$el.find('#table-allowed'),
        model: this.model
      });
      this.renderTables();

      this.drawerRoomCreateModeView = new DrawerRoomCreateModeView({
        model: this.model.toJSON(),
        mode: 'edition',
        el: this.$el.find('.drawer-room-create-mode-ctn')
      });
    },
    renderTables: function () {
      this.tablePending.render('pending');
      this.tableAllowed.render('allowed');
    },
    renderDropDown: function () {
      this.dropdown.addClass('open');
      this.dropdownMenu.html(templates['spinner.html']);

      var that = this;
      client.search(this.search.val(), false, true, 15, 0, false, function (data) {
        _.each(data.users.list, function (element, index, list) {
          list[index].avatarUrl = common.cloudinarySize(element.avatar, 20);
        });

        that.dropdownMenu.html(that.dropdownTemplate({users: data.users.list}));
      });
    },
    removeView: function () {
      this.remove();
    },
    onSearch: function (event) {
      event.preventDefault();

      clearTimeout(this.timeout);

      if (this.search.val() === '') {
        this.dropdown.removeClass('open');
        return;
      }

      if (event.type === 'click' || event.keyCode === 13) { // instant search when user click on icon or press enter
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
          client.roomAllow(this.model.get('id'), userId, false, _.bind(function () {
            this.renderTables();
          }, this));
        }, this));
      }

      // Close dropdown
      this.dropdown.removeClass('open');
      this.search.val('');
    }

  });

  return RoomAccessView;
});
