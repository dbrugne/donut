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
  '_templates'
], function ($, _, Backbone, i18next, moment, common, app, client, templates) {
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
      'keyup input[type=text]': 'onSearch'
    },

    initialize: function (options) {
      this.model = options.model;

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

      this.render();
    },
    render: function () {
    },
    renderDropDown: function () {
      this.dropdown.addClass('open');
      this.dropdownMenu.html(templates['spinner.html']);

      var that = this;
      client.search(this.search.val(), false, true, 15, 0, false, function (data) {
        console.log(data.users.list);
        _.each(data.users.list, function (u) {
          console.log(u.username);
        });
        that.dropdownMenu.html(that.dropdownTemplate({users: data.users.list}));
      });
    },
    onResponse: function (data) {
    },
    removeView: function () {
      this.remove();
    },
    onSearch: function (event) {
      event.preventDefault();

      if (this.search.val() !== '') {
        var that = this;
        clearTimeout(this.timeout);
        this.timeout = setTimeout(function () {
          that.renderDropDown();
        }, this.timeBufferBeforeSearch);
      } else {
        clearTimeout(this.timeout);
        this.dropdown.removeClass('open');
      }
    }

  });

  return RoomAccessView;
});
