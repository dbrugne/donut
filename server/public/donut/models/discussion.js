define([
  'underscore',
  'backbone',
  'collections/events',
  'models/event'
], function (_, Backbone, EventsCollection, EventModel) {
  var DiscussionModel = Backbone.Model.extend({

    defaults: function() {
      return {
        focused: false,
        unread: 0
      };
    },

    initialize: function(options) {
      this.events = new EventsCollection();
      this._initialize(options);
    },

    // To override
    _initialize: function(options) {
    },

    onEvent: function(type, data) {
      this.events.addEvent({
        type: type,
        data: data
      });

      // Unread message indication
      if (type == 'room:message' || type == 'user:message') {
        // discussion tab indication
        if (!this.get('focused')) {
          this.set({
            unread: this.get('unread') + 1
          });
        }

        // window title indication
        this.trigger('newMessage');
      }
    },

    message: function(message) {
      this.events.add(new EventModel(message));
    }

  });

  return DiscussionModel;
});