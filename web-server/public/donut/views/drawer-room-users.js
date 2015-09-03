'use strict';
define([
  'jquery',
  'underscore',
  'backbone',
  'common',
  'client',
  'models/current-user',
  'views/modal-confirmation',
  '_templates'
], function ($, _, Backbone, common, client, currentUser, confirmationView, templates) {
  var DrawerRoomUsersView = Backbone.View.extend({
    template: templates['drawer-room-users.html'],

    id: 'room-users',

    page: 1, // Start on index 1

    paginate: 15, // Number of users display on a page

    nbPages: 0,

    events: {},

    initialize: function (options) {
      this.model = options.model;

      this.render();
    },

    render: function () {
      // render spinner only
      this.$el.html(templates['spinner.html']);

      // ask for data
      var that = this;
      client.roomUsers(this.model.get('id'), 'devoice', null, {start: 0, length: this.paginate}, function (data) {
        that.onResponse(data);
      });
      return this;
    },
    onResponse: function (data) {
      _.each(data.users, function (element, index, list) {
        list[index].avatarUrl = common.cloudinarySize(element.avatar, 20);
      });

      var html = this.template({
        users_to_print: data.users,
        page: this.page,
        paginate: this.paginate,
        nbPages: data.nbUsers / this.paginate,
        room_name: data.room_name,
        owner_name: data.owner_name,
        owner_id: data.owner_id,
        nb_users: data.nbUsers
      });
      this.$el.html(html);
    }
  });
  return DrawerRoomUsersView;
});
