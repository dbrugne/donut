define([
  'underscore',
  'backbone',
  'models/client',
  'models/current-user',
  'models/onetoone',
  'models/event'
], function (_, Backbone, client, currentUser, OneToOneModel, EventModel) {
  var OnetoonesCollection = Backbone.Collection.extend({

    comparator: function(model1, model2) {
      return model1.get('username').toLowerCase()
        .localeCompare(model2.get('username').toLowerCase());
    },
    iwhere : function(key, val){ // insencitive case search
      var matches = this.filter(function(item){
        return item.get(key).toLocaleLowerCase() === val.toLocaleLowerCase();
      });

      if (matches.length < 1)
        return undefined;

      return matches[0];
    },

    initialize: function() {
      this.listenTo(client, 'user:message', this.onMessage);
      this.listenTo(client, 'user:leave', this.onLeave);
      this.listenTo(client, 'user:welcome', this.addModel);
    },
    // We ask to server to open this one to one
    openPing: function(username) {
      client.userJoin(username);
    },
    // Server confirm that we was joined to the one to one and give us some data on user
    addModel: function(user) {
      // prepare model data
      var oneData = {
        user_id: user.user_id,
        username: user.username,
        avatar: user.avatar,
        poster: user.poster,
        color: user.color,
        location: user.location,
        website: user.website,
        status: user.status
      };

      // update model
      var isNew = (this.get(user.username) == undefined)
        ? true
        : false;
      if (!isNew) {
        // already exist in IHM (maybe reconnecting)
        var model = this.get(user.username);
        model.set(oneData);
      } else {
        // add in IHM
        oneData.id = user.username;
        oneData.key = this._key(oneData.user_id, currentUser.get('user_id'));
        var model = new OneToOneModel(oneData);
      }

      // Add history
      if (user.history && user.history.length > 0) {
        _.each(user.history, function(event) {
          event.data.user_id = event.data.from_user_id;
          event.data.username = event.data.from_username;
          event.data.avatar = event.data.from_avatar;
          event.data.color = event.data.from_color;
          model.events.addEvent(event);
        });
      }

      if (isNew) {
        // now the view exists (created by mainView)
        this.add(model);
      }

      return model;
    },
    /**
     * Retrieve the current onetoone model OR create a new one
     * @param user
     * @return OnetooneModel
     */
    getModel: function(data) {
      var model = this.findWhere({'key': data.key});
      if (model == undefined) {
        model = this.addModel(data);
        // async !!
        client.userProfile(data.username);
      }

      return model;
    },
    _key: function(c1, c2) {
      return (c1 < c2)
        ? c1+'-'+c2
        : c2+'-'+c1;
    },
    onMessage: function(data) {
      var withUser;
      if (currentUser.get('user_id') == data.from_user_id) {
        // i'm emitter
        withUser = {
          username  : data.to_username,
          user_id   : data.to_user_id,
          avatar    : data.to_avatar,
          color     : data.to_color
        };
      } else if (currentUser.get('user_id') == data.to_user_id) {
        // i'm recipient
        withUser = {
          username  : data.from_username,
          user_id   : data.from_user_id,
          avatar    : data.from_avatar,
          color     : data.from_color
        };
      } else {
        return; // visibly something goes wrong
      }

      // Find or create the model
      withUser.key = this._key(data.from_user_id, data.to_user_id);
      var model = this.getModel(withUser);

      // Rework message object
      return model.onMessage({
        id: data.id,
        user_id: data.from_user_id,
        username: data.from_username,
        avatar: data.from_avatar,
        color: data.from_color,
        time: data.time,
        message: data.message
      });
    },
    onLeave: function(data) {
      var model = this.get(data.username);
      if (model) {
        this.remove(model);
      }
    }

  });

  return new OnetoonesCollection();
});