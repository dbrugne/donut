define([
  'jquery',
  'underscore',
  'backbone'
], function ($, _, Backbone) {
  var AlertView = Backbone.View.extend({

    initialize: function () {
      this.$alert = $('#alert > .alert');
      this.$message = $('#alert > .alert > .message');
      this.$close = $('#alert > .alert > .close-btn');

      var that = this;
      this.$close.click(function (event) {
        that.$message.html('');
        that.$alert
          .finish()
          .slideUp('fast')
          .removeClass('info warning error');
      });
    },

    /**
     * Display an automatic-hiddable alert box
     *
     * @param typeOfAlert could be info warn or error
     * @param message
     * @returns {AlertView}
     */
    show: function (typeOfAlert, message) {
      this.$message
        .html(message);
      this.$alert
        .finish()
        .removeClass('info warning error')
        .addClass(typeOfAlert)
        .slideDown('fast')
        .delay(1000*10)
        .slideUp('fast')
      ;

      return this;
    }

  });

  return AlertView;
});
