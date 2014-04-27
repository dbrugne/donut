define([
  'jquery',
  'underscore',
  'backbone',
  'collections/discussions'
], function ($, _, Backbone, discussions) {
  /**
   * Represent the browser window
   */
  var WindowView = Backbone.View.extend({

    el: $(window),

    focused: true,

    unread: 0,

    title: '',

    initialize: function(options) {
      this.$window = this.$el;
      this.$document = $(document);

      this.title = this.$document.attr('title');

      // Bind events
      that = this;
      this.$window.focus(function(event) {
        that.onFocus();
      });
      this.$window.blur(function(event) {
        that.onBlur();
      });
      this.$window.on('beforeunload', function() {
        return that.onClose();
      });
    },

    onBlur: function() {
      this.focused = false;
    },

    onFocus: function() {
      if (this.unread == 0) {
        return;
      }

      this.$document.attr('title', this.title);
      this.unread = 0;
      this.focused = true;
    },

    increment: function() {
      if (this.focused) {
        return;
      }

      this.unread += 1;
      this.$document.attr('title', '('+this.unread+') '+this.title);
    },

    onClose: function() {
      // only if at least one room is open
      if (discussions.length > 0) {
        return "If you leave this page all the room history will be lost.";
      } else {
        return;
      }
    }

  });

  return new WindowView();
});