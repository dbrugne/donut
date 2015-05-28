define([
  'jquery',
  'underscore',
  'backbone',
  'client',
  'collections/rooms',
  'collections/onetoones',
  'models/current-user',
  'moment',
  'views/window',
  '_templates'
], function ($, _, Backbone, client, rooms, onetoones, currentUser, moment, windowView, templates) {
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
      this.$menu = this.$el.find('.dropdown-menu #main-navbar-messages');

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
    onNewEvent: function(notification) {
      var template;
      switch (notification.type)
      {
        case 'roomop':
          template = templates['notifications/room-op.html']; break;
        case 'roomdeop':
          template = templates['notifications/room-deop.html']; break;
        case 'roomkick':
          template = templates['notifications/room-kick.html']; break;
        case 'roomban':
          template = templates['notifications/room-ban.html']; break;
        case 'roomdeban':
          template = templates['notifications/room-deban.html']; break;
        default:
        break;
      }
      return template({data:notification, from_now: moment(notification.data.time).fromNow()});
    },
    onShow: function(event) {
      console.log("show", event.relatedTarget);

      // Ask server for last 10 unread notifications
      client.userNotifications(10, _.bind(function(data){

        var html = '';
        for (var k in data.notifications)
        {
          html += this.onNewEvent(data.notifications[k]);
        }

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