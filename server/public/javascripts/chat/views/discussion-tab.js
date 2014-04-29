define([
  'jquery',
  'underscore',
  'backbone'
], function ($, _, Backbone) {
  var DiscussionTabView = Backbone.View.extend({

    model: '', // the current element

    collection: '', // the current element collection

    events: {
      "click .close": "closeThis"
    },

    initialize: function(options) {
      this.listenTo(this.model, 'change:focused', this.updateFocus);
      this.listenTo(this.model, 'change:unread', this.updateUnread);
      this.listenTo(this.collection, 'remove', this.removeView);

      this._initialize(options);

      this.render();
    },

    // To override
    _initialize: function(options) {
    },

    // To override
    _renderData: function() {
      return { };
    },

    removeView: function(model) {
      if (model === this.model) {
        this.remove();
      }
    },

    render: function() {
      var html = this.template(this._renderData());
      this.$el.html(html);
      return this;
    },

    updateFocus: function() {
      if (this.model.get('focused')) {
        this.$el.find('.item').addClass('active');
        this.model.set('unread', 0);
      } else {
        this.$el.find('.item').removeClass('active');
      }
    },

    updateUnread: function() {
      this.$el.find('.badge').html(this.model.get('unread'));
      if (this.model.get('unread') < 1) {
        this.$el.find('.badge').fadeOut(400);
        this.$el.removeClass('unread');
      } else {
        this.$el.find('.badge').fadeIn(400);
        this.$el.addClass('unread');
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

  return DiscussionTabView;
});