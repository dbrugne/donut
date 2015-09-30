var Backbone = require('backbone');
var i18next = require('i18next-client');
var common = require('@dbrugne/donut-common/browser');
var client = require('../libs/client');

var RoomTopicView = Backbone.View.extend({
  template: require('../templates/room-topic.html'),

  events: {
    'click .topic-current': 'showForm',
    'click .edit': 'showForm',
    'click .cancel': 'hideForm',
    'click .submit': 'sendNewTopic',
    'keypress .topic-input': function (event) {
      if (event.keyCode === 13) {
        this.sendNewTopic(event);
      }
    },
    'keyup .topic-input': function (event) {
      if (event.keyCode === 27) {
        this.hideForm();
      }
    }
  },
  initialize: function () {
    this.listenTo(this.model, 'change:topic', this.updateTopic);
    this.render();
  },
  render: function () {
    this.$el.html(this.template({
      isOwner: this.model.currentUserIsOwner(),
      isOp: this.model.currentUserIsOp(),
      isAdmin: this.model.currentUserIsAdmin(),
      roomId: this.model.get('id')
    }));

    this.$('.topic-current, .topic-form').hide();
    var currentTopic = this.model.get('topic');
    if (!currentTopic || currentTopic === '') {
      if (this.model.currentUserIsOp() || this.model.currentUserIsOwner() || this.model.currentUserIsAdmin()) {
        this.$('.txt')
          .html(i18next.t('chat.topic.default'))
          .attr('title', i18next.t('chat.topic.default'));
        this.$('.topic-current').css('display', 'inline-block');
      } else {
        this.$('.txt')
          .html('')
          .attr('title', '');
      }
    } else {
      // mentions
      var htmlTopic = common.markup.toHtml(currentTopic, {
        template: require('../templates/markup.html'),
        style: 'color: ' + this.model.get('color')
      });
      this.$('.txt')
        .html(htmlTopic)
        .attr('title', common.markup.toText(currentTopic))
        .smilify();
      this.$('.topic-current').css('display', 'inline-block');
    }

    return this;
  },
  updateTopic: function (room, topic, options) {
    this.render();
  },
  showForm: function () {
    if (!this.model.currentUserIsOp() && !this.model.currentUserIsOwner() && !this.model.currentUserIsAdmin()) {
      return false;
    }

    var topic = common.markup.toText(this.model.get('topic'));
    this.$('.topic-current').hide();
    this.$('.topic-form').css('display', 'block');
    this.$('.topic-input').val(topic).focus();
  },
  hideForm: function () {
    this.$('.topic-form').hide();
    this.$('.topic-current').css('display', 'inline-block');
  },
  sendNewTopic: function (event) {
    if (!this.model.currentUserIsOp() && !this.model.currentUserIsOwner() && !this.model.currentUserIsAdmin()) {
      return false;
    }

    var newTopic = this.$('.topic-input').val();

    // only if different
    if (newTopic === this.model.get('topic')) {
      this.hideForm();
      return;
    }

    // only if not too long
    if (newTopic.length <= 512) {
      client.roomTopic(this.model.get('id'), newTopic);
    }

    // reset form state
    this.$('.topic-input').val('');
    this.hideForm();
  },
  _remove: function () {
    this.remove();
  }

});

module.exports = RoomTopicView;
