define([
  'underscore',
  'backbone',
  'collections/messages',
  'models/message',
  'views/window'
], function (_, Backbone, MessagesCollection, MessageModel, windowView) {
  var DiscussionModel = Backbone.Model.extend({

    defaults: function() {
      return {
        focused: false,
        unread: 0
      };
    },

    initialize: function(options) {
      this.messages = new MessagesCollection();
      this._initialize(options);
    },

    // To override
    _initialize: function(options) {
    },

    message: function(message) {
      this.messages.add(new MessageModel(message)); // passing everything is maybe not ideal

      if (!this.get('focused')) {
        var unread = this.get('unread');
        this.set('unread', unread + 1);
      }

      // Unread indication in window title
      windowView.increment();
    }

  });

  return DiscussionModel;
});