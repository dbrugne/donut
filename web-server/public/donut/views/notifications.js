define([
  'jquery',
  'underscore',
  'backbone',
  'client',
  'collections/rooms',
  'collections/onetoones',
  'models/current-user',
  'views/window',
  '_templates'
], function ($, _, Backbone, client, rooms, onetoones, currentUser, windowView, templates) {
  var NotificationsView = Backbone.View.extend({

    el: $("#notifications"),

    template: templates['notifications.html'],

    events: {
      'show.bs.dropdown': 'onShow',
      'hide.bs.dropdown': 'onHide'
    },

    unreadCount: 0,

    initialize: function(options) {
      this.mainView = options.mainView;

      this.render();
    },
    render: function() {
      this.$dropdown = this.$el.find('.dropdown-toggle');
      this.$badge = this.$el.find('.badge').first();
      this.$menu = this.$el.find('.dropdown-menu');

      this.$dropdown.dropdown();

      return this;
    },
    setUnreadCount: function(count) {
      this.unreadCount = count;
      if (count > 0) {
        this.$badge.text(this.unreadCount).removeClass('hidden');
      }
      else
        this.$badge.addClass('hidden');
    },
    onShow: function(event) {
      console.log("show", event.relatedTarget);

      // Ask server for notifications
      client.userNotifications(10, _.bind(function(data){
        var html = this.template({
          notifications: data.notifications
        });

        this.$menu.html(html);
      }, this));

    },
    onHide: function(event) {
      console.log("hide", event.relatedTarget);
      // nothing
    },
    redraw: function() {
      return this.render();
    }

  });

  return NotificationsView;
});