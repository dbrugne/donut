var Backbone = require('backbone');
var common = require('@dbrugne/donut-common/browser');
var app = require('../libs/app');
var date = require('../libs/date');

var OneToOnePanelHeaderView = Backbone.View.extend({
  tagName: 'div',

  className: 'discussion-header-onetoone',

  template: require('../templates/discussion-onetoone-header.html'),

  events: {
    'click .ban-user': 'banUser',
    'click .deban-user': 'debanUser'
  },

  initialize: function () {
    this.listenTo(this.model, 'change:avatar', this.render);
    this.listenTo(this.model, 'change:realname', this.render);
    this.listenTo(this.model, 'change:location', this.render);
    this.listenTo(this.model, 'change:status', this.render);
    this.listenTo(this.model, 'change:banned', this.render);
    this.listenTo(this.model, 'change:i_am_banned', this.render);

    this.render();
  },
  render: function () {
    var data = this.model.toJSON();

    // avatar
    data.avatar = common.cloudinary.prepare(data.avatar, 100);
    data.onlined = null;
    if (this.model.get('status') !== 'online' && this.model.get('onlined')) {
      data.onlined = this.model.get('onlined');
      data.fromnow = date.fromnow(this.model.get('onlined'));
    }

    // render
    var html = this.template(data);
    this.$el.attr('data-identifier', this.model.get('identifier'));
    this.$el.html(html);

    return this;
  },
  onFocusChange: function () {
    if (this.model.get('focused')) {
      this.$el.show();

      // refocus an offline one after few times
      date.from('fromnow', this.$('.ago span'));
    } else {
      this.$el.hide();
    }
  },
  _remove: function () {
    this.remove();
  }
});

module.exports = OneToOnePanelHeaderView;
