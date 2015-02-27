define([
  'jquery',
  'underscore',
  'backbone'
], function ($, _, Backbone) {
  var ConfirmationModalView = Backbone.View.extend({

    el: $('#confirmation'),

    events: {
      "click .buttons .confirm": "onConfirm"
    },

    callback: null,

    options: null,

    initialize: function(options) {
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
    },
    render: function() {
      return this;
    },
    _reset: function() {
      this.$inputBlock.show();
      this.$input.val('');
      this.callback = null;
      this.options = null;

      // unbind 'enter'
      $(document).off('keypress');
    },
    open: function(options, callback) {
      this.options = options || {};
      this.callback = callback;

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
    }

  });

  return new ConfirmationModalView();
});
