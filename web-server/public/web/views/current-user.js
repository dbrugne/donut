var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var common = require('@dbrugne/donut-common/browser');
var currentUser = require('../models/current-user');

var CurrentUserView = Backbone.View.extend({
  el: $('#block-current-user'),

  template: require('../templates/current-user.html'),

  initialize: function (options) {
    this.listenTo(this.model, 'change', this.render);
  },
  render: function () {
    if (!currentUser.get('user_id'))
      return this; // nothing to render if welcome wasn't received

    var data = currentUser.toJSON();

    data.avatar = common.cloudinary.prepare(currentUser.get('avatar'), 60);

    var html = this.template(data);
    this.$el.html(html);
    return this;
  }

});


module.exports = CurrentUserView;