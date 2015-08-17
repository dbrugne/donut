define([
  'jquery',
  'underscore',
  'backbone',
  'libs/donut-debug',
  'models/current-user',
  '_templates'
], function ($, _, Backbone, donutDebug, currentUser, templates) {

  var debug = donutDebug('donut:input');

  var InputTypingView = Backbone.View.extend({

    template: templates['input-typing.html'],

    timeToMarkTypingFinished: 3000,

    events: {},

    initialize: function(options) {
      this.listenTo(this.model, 'typing', this.onSomeoneTyping);

      this.usersTyping = {};
    },

    render: function() {
      if(_.keys(this.usersTyping).length == 0)
        return this.$el.html('');
      var html = this.template({users: this.usersTyping});

      this.$el.html(html);
      return this;
    },

    onSomeoneTyping: function(data) {
      if (data.username === currentUser.get("username"))
        return;

      var that = this;
      if (!_.has(this.usersTyping, data.username)) {
        this.usersTyping[data.username] = setTimeout(function () {
          that.usersTyping = _.omit(that.usersTyping, data.username);
          that.render();
        }, this.timeToMarkTypingFinished);
        this.render();
      } else {
        clearTimeout(this.usersTyping[data.username]);
        this.usersTyping[data.username] = setTimeout(function () {
          that.usersTyping = _.omit(that.usersTyping, data.username);
          that.render();
        }, this.timeToMarkTypingFinished);
      }
    }
  });

  return InputTypingView;
});
