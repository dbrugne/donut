define([
  'jquery',
  'underscore',
  'backbone',
  'client',
  'models/current-user',
  '_templates'
], function ($, _, Backbone, client, currentUser, templates) {
  var RoomTopicView = Backbone.View.extend({

    template: templates['room-topic.html'],

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
        isOp: this.model.currentUserIsOp(),
        isAdmin: this.model.currentUserIsAdmin()
      }));

      this.$el.find('.topic-current, .topic-form').hide();
      var currentTopic = this.model.get('topic');
      if (currentTopic == undefined || currentTopic == '') {
        if (this.model.currentUserIsOp() || this.model.currentUserIsOwner() || this.model.currentUserIsAdmin()) {
          this.$el.find('.txt')
            .html($.t("chat.topic.default"))
            .attr('title', $.t("chat.topic.default"));
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
      if (!this.model.currentUserIsOp() && !this.model.currentUserIsOwner() && !this.model.currentUserIsAdmin())
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
      if (!this.model.currentUserIsOp() && !this.model.currentUserIsOwner() && !this.model.currentUserIsAdmin()) return false;

      var newTopic = this.$el.find('.topic-input').val();
      // only if not too long
      if (newTopic.length <= 512) client.roomTopic(this.model.get('name'), newTopic);

      // reset form state
      this.$el.find('.topic-input').val('');
      this.hideForm();
    },
    _remove: function() {
      this.remove();
    }

  });

  return RoomTopicView;
});