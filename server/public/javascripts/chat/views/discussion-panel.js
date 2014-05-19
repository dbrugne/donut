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
    }

  });

  return DiscussionPanelView;
});