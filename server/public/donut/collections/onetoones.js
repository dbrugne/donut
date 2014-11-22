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
      this.listenTo(client, 'user:welcome', this.addModel);
      this.listenTo(client, 'user:leave', this.onLeave);
      this.listenTo(client, 'user:message', this.onMessage);
      this.listenTo(client, 'user:updated', this.onUpdated);
      this.listenTo(client, 'user:online', this.onUserOnline);
      this.listenTo(client, 'user:offline', this.onUserOffline);
      this.listenTo(client, 'user:history', this.onHistory);
    },
    openPing: function(username) {
      // we ask to server to open this one to one
      client.userJoin(username);
    },
    addModel: function(user) {
      // server confirm that we was joined to the one to one and give us some data on user
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
        oneData.key = this._key(oneData.username, currentUser.get('username'));
        var model = new OneToOneModel(oneData);
      }

      // Add history
      model.set('preloadHistory', user.history);

      if (isNew) {
        // now the view exists (created by mainView)
        this.add(model);
      }

      return model;
    },
    getModelFromEvent: function(event, autoCreate) {
      if (!event.username) {
        var withUser;
        if (currentUser.get('username') == event.from_username) {
          // i'm emitter
          withUser = {
            username  : event.to_username,
            user_id   : event.to_user_id,
            avatar    : event.to_avatar,
            color     : event.to_color
          };
        } else if (currentUser.get('username') == event.to_username) {
          // i'm recipient
          withUser = {
            username  : event.from_username,
            user_id   : event.from_user_id,
            avatar    : event.from_avatar,
            color     : event.from_color
          };
        } else {
          return; // visibly something goes wrong
        }

        var key = this._key(event.from_username, event.to_username);
      } else {
        var key = this._key(event.username, currentUser.get('username'));
      }

      // retrieve the current onetoone model OR create a new one
      var model = this.findWhere({'key': key});
      if (model == undefined) {
        if (!autoCreate)
          return false;

        withUser.key = key;
        model = this.addModel(withUser);
      }

      return model;
    },
    _key: function(c1, c2) {
      return (c1 < c2)
        ? c1+'-'+c2
        : c2+'-'+c1;
    },

    onLeave: function(data) {
      var model = this.get(data.username);
      if (model) {
        this.remove(model);
      }
    },
    onMessage: function(data) {
      var model = this.getModelFromEvent(data, true);
      _.defer(function() { // cause view will be really added only on next tick
        model.onMessage(data);
      });
    },
    onUpdated: function(data) {
      var model = this.getModelFromEvent(data, false);
      if (!model)
        return;

      model.onUpdated(data);
    },
    onUserOnline: function(data) {
      var model = this.getModelFromEvent(data, false);
      if (!model)
        return;

      model.onUserOnline(data);
    },
    onUserOffline: function(data) {
      var model = this.getModelFromEvent(data, false);
      if (!model)
        return;

      model.onUserOffline(data);
    },
    onHistory: function(data) {
      var model = this.getModelFromEvent(data, false);
      if (!model)
        return;

      model.onHistory(data);
    }

  });

  return new OnetoonesCollection();
});