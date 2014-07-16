define([
  'jquery',
  'underscore',
  'backbone',
  'views/messages',
  'views/input'
], function ($, _, Backbone, MessagesView, InputView) {
  var DiscussionPanelView = Backbone.View.extend({

    tagName: 'div',

    className: 'discussion',

    events: {
    },

    initialize: function(options) {
      this.mainView = options.mainView;

      // Events
      this.listenTo(this.collection, 'remove', this.removeView);
      this.listenTo(this.model, 'change:focused', this.updateFocus);

      // Parent view rendering
      this.render();

      // Subviews initialization and rendering
      this.messagesView = new MessagesView({
        el: this.$el.find('.messages'),
        model: this.model,
        collection: this.model.messages
      });
      this.messageBoxView = new InputView({
        el: this.$el.find('.input'),
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

    // To override
    _focus: function() {
    },

    // To override
    _unfocus: function() {
    },

    render: function() {
      var html = this.template(this._renderData());
      this.$el.html(html);
      this.$el.hide();
      this._render();
      return this;
    },

    updateFocus: function() {
      if (this.model.get('focused')) {
        this.$el.show();
        this.$el.find('.input-message').focus();
        this._focus();
      } else {
        this.$el.hide();
        this._unfocus();
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