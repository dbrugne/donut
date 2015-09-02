define([
  'jquery',
  'underscore',
  'backbone',
  'models/app',
  'libs/donut-debug',
  'views/events',
  'views/input'
], function ($, _, Backbone, app, donutDebug, EventsView, InputView) {

  var debug = donutDebug('donut:discussion');

  var DiscussionPanelView = Backbone.View.extend({

    tagName: 'div',

    className: 'discussion',

    hasBeenFocused: false,

    events: {
    },

    initialize: function(options) {
      debug.start('discussion-'+((this.model.get('name'))?this.model.get('name'):this.model.get('username')));
      var start = Date.now();

      // Events
      this.listenTo(this.model, 'change:focused', this.updateFocus);

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
      this.listenTo(this.inputView, 'send', this.onSend);
      this.listenTo(this.inputView, 'editPreviousInput', this.onEditPreviousInput);

      // Other subviews
      this._initialize(options);
      debug.end('discussion-'+((this.model.get('name'))?this.model.get('name'):this.model.get('username')));
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

    update: function() {
      this.eventsView.update();
    },

    updateFocus: function() {
      if (this.model.get('focused')) {
        // to focus
        this.$el.show();

        // focus input field
        this.model.trigger('inputFocus');

        // need to load history?
        if (!this.hasBeenFocused)
          this.firstFocus();
        this.hasBeenFocused = true;

        if (this.eventsView.scrollWasOnBottom)
          this.eventsView.scrollDown(); // will trigger markVisibleAsViewed() implicitly
        else
          this.eventsView.onScroll(); // trigger markVisibleAsViewed()

        this.eventsView.scrollWasOnBottom = false;

        this._focus();
      } else {
        // to unfocus
        this.eventsView.scrollWasOnBottom = this.eventsView.isScrollOnBottom(); // persist scroll position before hiding
        this.$el.hide();
        this._unfocus();
      }
    },

    firstFocus: function() {
      this.eventsView.requestHistory('bottom'); // @todo : on reconnect (only), remove all events in view before requesting history // seems to work like that, wait and see if bugs happen ...
      this.eventsView.scrollDown();
      this._firstFocus();
    },

    removeView: function(model) {
      this._remove();
      this.eventsView._remove();
      this.inputView._remove();
      this.remove();
    },

    colorify: function() {
      if (this.model.get('focused')) {
        app.trigger('changeColor', this.model.get('color'));
      }
    },

    onSend: function() {
      this.eventsView.scrollDown(); // scroll down automatically when I send a message
    },

    onEditPreviousInput: function() {
      this.eventsView.pushUpFromInput();
    }

  });

  return DiscussionPanelView;
});