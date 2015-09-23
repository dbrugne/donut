var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var donutDebug = require('../libs/donut-debug');
var client = require('../libs/client');
var currentUser = require('../models/current-user');

var debug = donutDebug('donut:input');

var InputTypingView = Backbone.View.extend({
  template: require('../templates/input-typing.html'),

  timeToMarkTypingFinished: 4000,

  timeToSendAnotherTypingEvent: 3000,

  canSendTypingEvent: true,

  initialize: function (options) {
    this.listenTo(this.model, 'typing', this.onSomeoneTyping);
    this.listenTo(this.model, 'inputKeyUp', this.onCurrentUserTyping);

    this.usersTyping = {};
  },

  render: function () {
    if (_.keys(this.usersTyping).length == 0)
      return this.$el.html('');

    var html = this.template({users: this.usersTyping});
    this.$el.html(html);
    return this;
  },

  onSomeoneTyping: function (data) {
    if (data.user_id === currentUser.get('user_id'))
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
  },

  onCurrentUserTyping: function (data) {
    if (!this.canSendTypingEvent)
      return;

    if (this.model.get('type') === 'room')
      client.roomTyping(this.model.get('id'));
    else
      client.userTyping(this.model.get('user_id'));

    this.canSendTypingEvent = false;
    setTimeout(_.bind(function () {
      this.canSendTypingEvent = true;
    }, this), this.timeToSendAnotherTypingEvent);
  }

});


module.exports = InputTypingView;