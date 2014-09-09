define([
  'jquery',
  'underscore',
  'backbone',
  'collections/rooms',
  'collections/onetoones'
], function ($, _, Backbone, rooms, onetoones) {
  /**
   * Represent the browser window
   */
  var WindowView = Backbone.View.extend({

    el: $(window),

    focused: true,

    unread: 0,

    defaultTitle: '',

    title: '',

    initialize: function(options) {
      this.$window = this.$el;
      this.$document = $(document);

      this.defaultTitle = document.title; // save original title on page load

      // Bind events to browser window
      var that = this;
      this.$window.focus(function(event) {
        that.onFocus();
      });
      this.$window.blur(function(event) {
        that.onBlur();
      });
      this.$window.on('beforeunload', function() {
        return that.onClose();
      });

      // Bind events to model
      this.listenTo(rooms, 'newMessage', this.increment); // @todo : nasty event
      this.listenTo(onetoones, 'newMessage', this.increment); // @todo : nasty event
    },

    renderTitle: function() {
      var title = '';

      if (this.unread > 0)
        title += '('+this.unread+') ';

      title += this.defaultTitle;

      if (this.title && this.title.length)
        title += ' | '+this.title;

      document.title = title;
    },

    setTitle: function(title) {
      this.title = title;
      this.renderTitle();
    },

    onBlur: function() {
      this.focused = false;
    },

    onFocus: function() {
      this.focused = true;
      
      if (this.unread == 0) {
        return;
      }

      this.unread = 0;
      this.renderTitle();
    },

    increment: function() {
      if (this.focused) {
        return;
      }

      this.unread += 1;
      this.renderTitle();
    },

    onClose: function() {
      // only if at least one room is open
      if ((rooms && rooms.length > 0) || (onetoones && onetoones.length > 0)) {
        return $.t("chat.closemessage");
      } else {
        return;
      }
    }

  });

  return new WindowView();
});
