define([
  'jquery',
  'underscore',
  'backbone',
  'text!templates/modal.html'
], function ($, _, Backbone, modalTemplate) {
  var ModalView = Backbone.View.extend({

    tagName: 'div',
    className: 'modal fade',

    modalTemplate: _.template(modalTemplate),

    events: {
      'hidden.bs.modal': 'teardown'
    },

    // to override
    _initialize: function(options) {
    },

    initialize: function(options) {
      this.mainView = options.mainView;

      // Render and add modal to the DOM
      this.modalRender(options);

      // Child object initializer
      this._initialize(options);
    },
    modalRender: function(options) {
      var html = this.modalTemplate({
        title: options.title || ''
      });
      this.$el.html(html);
      this.$el.appendTo('#modals');
    },
    show: function() {
      this.$el.modal('show');
    },
    hide: function() {
      this.$el.modal('hide');
    },
    teardown: function() {
      this.$el.data('modal', null);
    }

  });

  return ModalView;
});