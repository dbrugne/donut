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
  '_templates'
], function ($, _, Backbone, i18next, moment, common, app, client, ConfirmationView, TableView, templates) {
  var RoomAccessView = Backbone.View.extend({

    template: templates['drawer-room-access.html'],

    dropdownTemplate: templates['drawer-room-access-dropdown.html'],

    id: 'room-access',

    page: 1, // Start on index 1

    paginate: 15, // Number of users display on a page

    nbPages: 0, // Store total number of pages

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
        types: this.types
      };

      var html = this.template(data);
      this.$el.html(html);

      this.search = this.$('input[type=text]');
      this.dropdown = this.$('.dropdown');
      this.dropdownMenu = this.$('.dropdown-menu');
      this.tablePending = new TableView({
        el: this.$('#table-allow-pending'),
        model: this.model
      });
      this.tableAllowed = new TableView({
        el: this.$('#table-allowed'),
        model: this.model
      });
      this.renderTables();
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
          client.roomAllow(this.model.get('id'), userId, false);
        }, this));
      }
    }

  });

  return RoomAccessView;
});
