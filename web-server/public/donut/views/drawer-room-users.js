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

    room: {},

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
      client.roomRead(this.model.get('id'), null, function (err, data) {
        if (!err) {
          that.onResponse(data);
        }
      });

      return this;
    },
    onResponse: function (room) {
      if (room.color) {
        this.trigger('color', room.color);
      }

      // room.isPoOrOwner =
      room.owner.avatarUrl = common.cloudinarySize(room.owner.avatar, 20);

      _.each(room.users, function (element, index, list) {
        list[index].avatarUrl = common.cloudinarySize(element.avatar, 20);
      });
      _.each(room.op, function (element, index, list) {
        list[index].avatarUrl = common.cloudinarySize(element.avatar, 20);
      });
      _.each(room.devoices, function (element, index, list) {
        list[index].avatarUrl = common.cloudinarySize(element.avatar, 20);
      });
      _.each(room.bans, function (element, index, list) {
        list[index].avatarUrl = common.cloudinarySize(element.avatar, 20);
      });

      this.room = room;
      this.room.users_number = room.users.length;
      this.nbPages = room.users.length / this.paginate;

      var html = this.template({
        room: this.room,
        users_to_print: room.users,
        page: this.page,
        paginate: this.paginate,
        nbPages: this.nbPages
      });
      this.$el.html(html);
    }
  });
  return DrawerRoomUsersView;
});
