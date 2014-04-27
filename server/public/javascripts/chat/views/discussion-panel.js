define([
  'jquery',
  'underscore',
  'backbone',
  'views/discussion-messages',
  'views/discussion-messagebox'
], function ($, _, Backbone, DiscussionMessageView, DiscussionMessageBoxView) {
  var DiscussionPanelView = Backbone.View.extend({

    tagName: 'div',

    className: 'discussion',

    events: {
      "click .close": "closeThis"
    },

    initialize: function(options) {
      // Events
      this.listenTo(this.collection, 'remove', this.removeView);
      this.listenTo(this.model, 'change:focused', this.updateFocus);

      // Parent view rendering
      this.render(); // (now exists in DOM)

      // Subviews initialization and rendering
      this.messagesView = new DiscussionMessageView({
        el: this.$el.find('.messages'),
        model: this.model,
        collection: this.model.messages
      });
      this.messageBoxView = new DiscussionMessageBoxView({
        el: this.$el.find('.message-box'),
        model: this.model
      });
      // (later we will be able to re-render each subview individually without touching this view)

      // Other subviews
      this._initialize(options);
    },

    // To override
    _initialize: function(options) {
    },

    // To override
    _remove: function(model) {
    },

    // To override
    _renderData: function() {
    },

    // To override
    _render: function() {
    },

    render: function() {
      var html = this.template(this._renderData());
      this.$el.html(html);
      this.$el.hide();
      return this;
    },

    updateFocus: function() {
      if (this.model.get('focused')) {
        this.$el.fadeIn(400);
        this.$el.find('.input-message').focus();
      } else {
        this.$el.hide();
      }
    },

    removeView: function(model) {
      if (model === this.model) {
        this._remove();
        this.messagesView.remove();
        this.messageBoxView.remove();
        this.remove();
      }
    },

    closeThis: function(event) { // @todo : duplicate code tab/window
      this.collection.remove(this.model); // remove model from collection

      // After remove, the room still exists but is not in the collection,
      // = .focus() call will choose another room to be focused
      if (this.model.get('focused')) {
        this.collection.focus();
      }

      return false; // stop propagation
    }

  });

  return DiscussionPanelView;
});