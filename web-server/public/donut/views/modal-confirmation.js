define([
  'jquery',
  'underscore',
  'backbone'
], function ($, _, Backbone) {
  var ConfirmationModalView = Backbone.View.extend({

    el: $('#confirmation'),

    events: {
      "click .buttons .confirm": "onConfirm",
      "click .buttons .cancel": "onCancel"
    },

    callback: null,
    cancelCallback: null,

    options: null,

    isRendered: false,

    initialize: function(options) {

    },
    render: function() {
      this.$inputBlock = this.$el.find('.input');
      this.$input = this.$inputBlock.find('input[type="text"]');

      // Configure modal
      this.$el.modal({
        keyboard: true,
        show: false
      });

      // On dismiss reset confirmation modal state
      var that = this;
      this.$el.on('hidden.bs.modal', function (e) {
        that._reset();
      });

      this.isRendered = true; // avoid to early rendering on page load (cause bootstrap is not already loaded)
      return this;
    },
    _reset: function() {
      this.$inputBlock.show();
      this.$input.val('');
      this.callback = null;
      this.cancelCallback = null;
      this.options = null;

      // unbind 'enter'
      $(document).off('keypress');
    },
    open: function(options, callback, cancelCallback) {
      $('.modal').modal('hide');

      if (!this.isRendered) {
        this.render();
      }

      this.options = options || {};
      this.callback = callback;
      this.cancelCallback = cancelCallback;

      // input field
      if (this.options.input)
        this.$inputBlock.show();
      else
        this.$inputBlock.hide();

      // bind 'enter' only when showing popin
      var that = this;
      $(document).keypress(function(e) {
        if(e.which == 13) {
          that.onConfirm(e);
        }
      });

      this.$el.modal('show');
    },
    onConfirm: function(event) {
      event.preventDefault();

      var input = this.$input.val();
      this.callback(input);
      this.$el.modal('hide');
      this._reset();
    },
    onCancel: function() {
      var callback = this.cancelCallback; // Required here because .modal('hide') also reset
      this.$el.modal('hide');

      if (callback)
        return callback();
    }
  });

  return new ConfirmationModalView();
});
