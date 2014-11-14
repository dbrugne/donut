define([
  'jquery',
  'underscore',
  'backbone',
  'models/client',
  'models/current-user',
  'text!templates/room-topic.html'
], function ($, _, Backbone, client, currentUser, topicTemplate) {
  var RoomTopicView = Backbone.View.extend({

    template: _.template(topicTemplate),

    defaultText: $.t("chat.topic.default"),

    events: {
      'click .topic-current': 'showForm',
      'click .edit'         : 'showForm',
      'click .cancel'       : 'hideForm',
      'click .submit'       : 'sendNewTopic',
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
      this.$el.html(this.template({
        isOwner: this.model.currentUserIsOwner(),
        isOp: this.model.currentUserIsOp()
      }));

      this.$el.find('.topic-current, .topic-form').hide();
      var currentTopic = this.model.get('topic');
      if (currentTopic == undefined || currentTopic == '') {
        if (this.model.currentUserIsOp() || this.model.currentUserIsOwner()) {
          this.$el.find('.txt')
            .html(this.defaultText)
            .attr('title', this.defaultText);
          this.$el.find('.topic-current').css('display', 'inline-block');
        } else {
          this.$el.find('.txt')
            .html('')
            .attr('title', '');
        }
      } else {
        this.$el.find('.txt')
          .text(currentTopic)
          .attr('title', currentTopic)
          .smilify()
          .linkify();
        this.$el.find('.topic-current').css('display', 'inline-block');
      }

      return this;
    },
    updateTopic: function(room, topic, options) {
      this.render();
    },
    showForm: function() {
      if (!this.model.currentUserIsOp() && !this.model.currentUserIsOwner())
        return false;

      this.$el.find('.topic-current').hide();
      this.$el.find('.topic-form').css('display', 'block');
      this.$el.find('.topic-input').val(this.model.get('topic')).focus();
    },
    hideForm: function() {
      this.$el.find('.topic-form').hide();
      this.$el.find('.topic-current').css('display', 'inline-block');
    },
    sendNewTopic: function(event) {
      if (!this.model.currentUserIsOp() && !this.model.currentUserIsOwner()) return false;

      var newTopic = this.$el.find('.topic-input').val();
      // only if not too long
      if (newTopic.length <= 130) client.topic(this.model.get('name'), newTopic);

      // reset form state
      this.$el.find('.topic-input').val('');
      this.hideForm();
    }

  });

  return RoomTopicView;
});