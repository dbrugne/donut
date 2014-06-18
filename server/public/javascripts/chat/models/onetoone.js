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
        status: '',
        type: 'onetoone', // @todo : remove
        focused: false,
        unread: 0
      };
    },
    _initialize: function() {
      this.listenTo(client, 'user:status', this.onStatus);
      this.on('remove', this.close);
    },
    close: function(model, collection, options) {
      client.close(model.get('username'));
    },
    onStatus: function(data) {
      if (data.username != this.get('username')) return;
      this.set({status: data.status});
    }

  });

  return OneToOneModel;
});