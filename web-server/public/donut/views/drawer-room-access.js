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

    events: {
    },

    initialize: function () {
      this.render();
    },
    render: function () {
      var html = this.template({
        owner_id: this.model.get('owner').get('user_id'),
        owner_name: this.model.get('owner').get('username'),
        room_id: this.model.get('id'),
        room_name: this.model.get('name')
      });
      this.$el.html(html);

      return this;
    },
    removeView: function () {
      this.remove();
    }

  });

  return RoomAccessView;
});
