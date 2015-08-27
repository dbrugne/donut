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

    confirmCallback: null,

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

      var that = this;

      this.$el.on('shown.bs.modal', function(e){
        that.$input.focus();
      });
      this.$el.on('hidden.bs.modal', function (e) {
        if (_.isFunction(that.cancelCallback))
          that.cancelCallback();

        that._reset();
      });

      this.isRendered = true; // avoid to early rendering on page load (cause bootstrap is not already loaded)
      return this;
    },
    _reset: function() {
      this.$inputBlock.show();
      this.$input.val('');
      this.confirmCallback = null;
      this.cancelCallback = null;
      this.options = null;

      // unbind 'enter'
      $(document).off('keypress');
    },
    open: function(options, confirmCallback, cancelCallback) {
      if (!this.isRendered) {
        this.render();
      }

      this.options = options || {};
      this.confirmCallback = confirmCallback;
      this.cancelCallback = cancelCallback || _.noop;

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

      this.confirmCallback(this.$input.val());
      this._reset(); // before hide to disable cancelCallback call
      this.$el.modal('hide');
    }

  });

  return new ConfirmationModalView();
});
