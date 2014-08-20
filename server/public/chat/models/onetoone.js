define([
  'underscore',
  'backbone',
  'models/client',
  'models/discussion'
], function (_, Backbone, client, DiscussionModel) {
  var OneToOneModel = DiscussionModel.extend({

    defaults: function() {
      return {
        username: '',
        user_id: '',
        avatar: '',
        poster: '',
        color: '',
        location: '',
        website: '',
        status: '',
        type: 'onetoone',
        focused: false,
        unread: 0
      };
    },
    _initialize: function() {
      this.listenTo(client, 'user:status', this.onStatus);
    },
    onStatus: function(data) {
      if (data.username != this.get('username')) return;
      this.set({status: data.status});
    }

  });

  return OneToOneModel;
});