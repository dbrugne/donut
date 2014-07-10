define([
  'jquery',
  'underscore',
  'backbone'
], function ($, _, Backbone) {
  var AlertView = Backbone.View.extend({

    initialize: function () {
      this.$alert = $('#alert > .alert');
    },

    /**
     * Display an automatic-hiddable alert box
     *
     * @param typeOfAlert could be info warn or error
     * @param message
     * @returns {AlertView}
     */
    show: function (typeOfAlert, message) {
      this.$alert
        .finish()
        .removeClass('info warning error')
        .addClass(typeOfAlert)
        .html(message)
        .slideDown('fast')
        .delay(2000)
        .slideUp('fast')
      ;

      return this;
    }
  });

  return AlertView;
});
