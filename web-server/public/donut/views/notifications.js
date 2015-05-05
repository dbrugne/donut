define([
  'jquery',
  'underscore',
  'backbone',
  'collections/rooms',
  'collections/onetoones',
  'models/current-user',
  'views/window',
  '_templates'
], function ($, _, Backbone, rooms, onetoones, currentUser, windowView, templates) {
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
      if (count)
        this.$badge.text(this.unreadCount);
      else
        this.$badge.text('');
    },
    onShow: function(event) {
      console.log("show", event.relatedTarget);

      // render list
      var html = this.template({
        notifications: ['do', 're', 'mi', 'fa']
      });
      this.$menu.html(html);
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