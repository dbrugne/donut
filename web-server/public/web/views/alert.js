var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var app = require('../libs/app');

var AlertView = Backbone.View.extend({
  initialize: function () {
    this.listenTo(app, 'alert', this.onAlert);

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
   * @param type could be 'info', 'warn' or 'error'
   * @param message
   * @returns {AlertView}
   */
  onAlert: function (type, message) {
    type = type || 'info';
    this.$message
      .html(message);
    this.$alert
      .finish()
      .removeClass('info warning error')
      .addClass(type)
      .slideDown('fast')
      .delay(1000 * 10)
      .slideUp('fast');

    return this;
  }

});


module.exports = AlertView;