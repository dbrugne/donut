var _ = require('underscore');
var Backbone = require('backbone');
var currentUser = require('./current-user');

var EventModel = Backbone.Model.extend({
  default: function () {
    return {
      // id
      type: '',
      data: {}
    };
  },

  /**
   * Hydrate model from .data property
   * @param options
   */
  initialize: function (options) {
    var data = this.get('data');
    if (!data) {
      data = {};
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

    var isNew = (this.get('new'));
    this.set({ new: isNew });

    if (this.get('type') === 'user:message') {
      data.user_id = data.from_user_id;
      data.username = data.from_username;
      data.avatar = data.from_avatar;
      data.color = data.from_color;
    }

    this.set({ data: data });
  },

  getGenericType: function () {
    if (currentUser.get('user_id') === this.get('data').user_id &&
      this.get('type') === 'room:in') {
      return 'hello';
    }
    if (['room:message', 'user:message'].indexOf(this.get('type')) !== -1) {
      return 'message';
    } else if ([
      'room:in',
      'room:out',
      'user:online',
      'user:offline'
    ].indexOf(this.get('type')) !== -1) {
      return 'inout';
    } else {
      return 'standard';
    }
  }

});


module.exports = EventModel;