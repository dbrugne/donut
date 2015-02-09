define([
  'jquery',
  'underscore',
  'backbone',
  'views/events',
  'views/input'
], function ($, _, Backbone, EventsView, InputView) {
  var DiscussionPanelView = Backbone.View.extend({

    tagName: 'div',

    className: 'discussion',

    hasBeenFocused: false,

    events: {
    },

    initialize: function(options) {
      window.debug.start('discussion-'+((this.model.get('name'))?this.model.get('name'):this.model.get('username')));
      var start = Date.now();
      this.mainView = options.mainView;

      // Events
      this.listenTo(this.model, 'change:focused', this.updateFocus);
      this.listenTo(this.model, 'resize', this.onResize);

      // Parent view rendering
      this.render();

      // Subviews initialization and rendering
      this.eventsView = new EventsView({
        el: this.$el.find('.events'),
        model: this.model
      });
      this.inputView = new InputView({
        el: this.$el.find('.input'),
        model: this.model
      });
      this.listenTo(this.inputView, 'resize', this.onResize);
      this.listenTo(this.inputView, 'send', this.onSend);

      // Other subviews
      this._initialize(options);
      window.debug.end('discussion-'+((this.model.get('name'))?this.model.get('name'):this.model.get('username')));
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

    // To override
    _firstFocus: function() {
    },

    render: function() {
      var html = this.template(this._renderData());
      this.$el.html(html);
      this.$el.hide();
      this._render();
      return this;
    },

    updateFocus: function() {
      // to focus
      if (this.model.get('focused')) {
        this.$el.show();

        // focus input field
        if (this.$editable)
          this.$editable.focus();

        // need to load history?
        if (!this.hasBeenFocused)
          this.firstFocus();
        this.hasBeenFocused = true;

        // resize and scroll down
        var that = this;
        _.defer(function() {
          that.onResize()
        });

        this._focus();
      } else {
        // to unfocus
        this.$el.hide();
        this._unfocus();
      }
    },

    firstFocus: function() {
      this.model.history(null);
      this._firstFocus();
    },

    removeView: function(model) {
      if (model === this.model) {
        this._remove();
        this.eventsView._remove();
        this.inputView._remove();
        this.remove();
      }
    },

    colorify: function() {
      this.$el.attr('data-colorify', this.model.get('color'));
      this.$el.colorify();
      if (this.model.get('focused'))
        this.mainView.color(this.model.get('color'));
      // + change data-colorify for side and blur (=darker)
    },

    onResize: function() {
      var $content = this.$el.find('.content');
      var totalHeight = $content.outerHeight();
      var headerHeight = $content.find('.header').outerHeight();

      var inputHeight = this.inputView.$el.outerHeight();
      var eventsHeight = totalHeight - (headerHeight + inputHeight);

      this.eventsView.resize(eventsHeight);
      //window.debug.log('resize call by window ('+totalHeight+', '+headerHeight+', '+inputHeight+', '+eventsHeight+')');
    },

    onSend: function() {
      this.eventsView.scrollDown(); // scroll down automatically when I send a message
    }

  });

  return DiscussionPanelView;
});