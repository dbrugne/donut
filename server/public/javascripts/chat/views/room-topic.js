define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'text!templates/room-topic.html'
], function ($, _, Backbone, client, topicTemplate) {
  var RoomTopicView = Backbone.View.extend({

    template: _.template(topicTemplate),

    defaultText: '<em>no topic</em>',

    events: {
      'click .topic': 'showForm',
      'click .topic-cancel': 'hideForm',
      'click .topic-submit': 'sendNewTopic',
      'keypress .topic-input': function(event) {
        if (event.which == 13) {
          this.sendNewTopic(event);
        }
      }
    },

    initialize: function() {
      this.listenTo(this.model, 'change:topic', this.updateTopic);
      this.render();
    },

    render: function() {
      this.$el.html(this.template());

      var currentTopic = this.model.get('topic');
      if (currentTopic == '') {
        currentTopic = this.defaultText;
      }

      this.$el.find('.topic').html(currentTopic);
      this.$el.find('.topic-form').hide();

      return this;
    },

    updateTopic: function(room, topic, options) {
      if (topic == '') {
        topic = this.defaultText;
      }
      this.$el.find('.topic').html(topic);
    },

    showForm: function() {
      this.$el.find('.topic').hide();
      this.$el.find('.topic-form').show();
      this.$el.find('.topic-input').val(this.model.get('baseline')).focus();
    },

    hideForm: function() {
      this.$el.find('.topic-form').hide();
      this.$el.find('.topic').show();
    },

    sendNewTopic: function(event) {
      var newTopic = this.$el.find('.topic-input').val();
      client.topic(this.model.get('name'), newTopic);
      this.$el.find('.topic-input').val('');
      this.hideForm();
    }
  });

  return RoomTopicView;
});