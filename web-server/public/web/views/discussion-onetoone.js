var Backbone = require('backbone');
var common = require('@dbrugne/donut-common/browser');
var app = require('../libs/app');
var EventsView = require('./discussion-events');
var InputView = require('./discussion-input');
var OneHeaderView = require('./discussion-onetoone-header');
var date = require('../libs/date');

var OneToOnePanelView = Backbone.View.extend({
  tagName: 'div',

  className: 'discussion',

  template: require('../templates/discussion-onetoone.html'),

  initialize: function () {
    this.listenTo(this.model, 'change:focused', this.onFocusChange);
    this.listenTo(this.model, 'change:poster', this.onPoster);
    this.listenTo(this.model, 'change:unviewed', this.onMarkAsViewed);

    this.render();

    this.headerView = new OneHeaderView({
      el: this.$el.find('.header'),
      model: this.model
    });
    this.eventsView = new EventsView({
      el: this.$el,
      model: this.model
    });
    this.inputView = new InputView({
      el: this.$('.input'),
      model: this.model
    });
  },
  render: function () {
    var html = this.template(this.model.toJSON());
    this.$el.attr('data-identifier', this.model.get('identifier'));
    this.$el.html(html);

    return this;
  },
  removeView: function (model) {
    this.eventsView._remove();
    this.inputView._remove();
    this.headerView._remove();
    this.remove();
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
  onPoster: function (model, url, options) {
    this.$('div.side').css('background-image', 'url(' + url + ')');
    this.$('div.side').removeClass('poster-empty');
    if (url === '') {
      this.$('div.side').addClass('poster-empty');
    }
  },
  onMarkAsViewed: function (data) {
    if (data.get('unviewed') === true) {
      return;
    }

    this.eventsView.hideUnviewedBlocks();
  }
});

module.exports = OneToOnePanelView;
