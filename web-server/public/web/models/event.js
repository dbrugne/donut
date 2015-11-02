var _ = require('underscore');
var Backbone = require('backbone');
var currentUser = require('./current-user');

module.exports = Backbone.Model.extend({
  initialize: function () {
    var data = this.get('data');
    if (!data) {
      data = {};
    }

    if (this.get('type') === 'room:in' &&
      currentUser.get('user_id') === this.get('data').user_id) {
      this.set('type', 'hello');
    }

    var id = (data.id)
      ? data.id
      : _.uniqueId('auto_'); // non-server events (disconnected, reconnected)
    this.set({ id: id });
    data.id = id; // non-server events

    var time = (data.time)
      ? data.time
      : Date.now(); // non-server events (disconnected, reconnected)
    this.set({ time: time });
    data.time = time; // non-server events (disconnected, reconnected)

    if (this.get('type') === 'user:message') {
      data.user_id = data.from_user_id;
      data.username = data.from_username;
      data.avatar = data.from_avatar;
      data.color = data.from_color;
    }

    this.set({ data: data });
  }
});
