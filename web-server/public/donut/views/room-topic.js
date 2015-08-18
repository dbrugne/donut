define([
  'jquery',
  'underscore',
  'backbone',
  'common',
  'client',
  'models/current-user',
  'views/modal-room-users',
  '_templates'
], function ($, _, Backbone, common, client, currentUser, RoomUsersModalView, templates) {
  var RoomTopicView = Backbone.View.extend({

    template: templates['room-topic.html'],

    events: {
      'click .topic-current': 'showForm',
      'click .edit'         : 'showForm',
      'click .cancel'       : 'hideForm',
      'click .submit'       : 'sendNewTopic',
      'click .drawer-users' : 'loadUserModal',
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
      if (!currentTopic || currentTopic === '') {
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
        // mentions
        var htmlTopic = common.markupToHtml(_.escape(currentTopic), {
          template: templates['mention.html'],
          style: 'color: ' + this.model.get('color')
        });
        this.$el.find('.txt')
          .html(htmlTopic)
          .attr('title', common.markupToText(currentTopic))
          .smilify();
        this.$el.find('.topic-current').css('display', 'inline-block');
      }

      this.roomUsersModalView = new RoomUsersModalView({
        el: this.$el.find('#user-modal'),
        model: this.model
      });

      return this;
    },
    updateTopic: function(room, topic, options) {
      this.render();
    },
    showForm: function() {
      if (!this.model.currentUserIsOp() && !this.model.currentUserIsOwner() && !this.model.currentUserIsAdmin())
        return false;

      var topic = common.markupToText(this.model.get('topic'));
      this.$el.find('.topic-current').hide();
      this.$el.find('.topic-form').css('display', 'block');
      this.$el.find('.topic-input').val(topic).focus();
    },
    hideForm: function() {
      this.$el.find('.topic-form').hide();
      this.$el.find('.topic-current').css('display', 'inline-block');
    },
    sendNewTopic: function(event) {
      if (!this.model.currentUserIsOp() && !this.model.currentUserIsOwner() && !this.model.currentUserIsAdmin()) return false;

      var newTopic = this.$el.find('.topic-input').val();

      // only if different
      if (newTopic == this.model.get('topic')) {
        this.hideForm();
        return;
      }

      // only if not too long
      if (newTopic.length <= 512)
        client.roomTopic(this.model.get('name'), newTopic);

      // reset form state
      this.$el.find('.topic-input').val('');
      this.hideForm();
    },
    _remove: function() {
      this.remove();
    },

    loadUserModal: function(event) {
      event.preventDefault();
      this.roomUsersModalView.show();
      client.roomUsers(this.model.get('name'), _.bind(function(data) {
        if (!data || !data.users)
          return this.roomUsersModalView.hide();

        this.roomUsersModalView.render(data);
      }, this));
    }

  });

  return RoomTopicView;
});