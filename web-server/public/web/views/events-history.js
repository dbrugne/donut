var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var app = require('../libs/app');

module.exports = Backbone.View.extend({
  historyLoading: false,
  historyNoMore: false,
  numberOfEventsToRetrieve: 50,

  initialize: function (options) {
    this.parent = options.parent;
    this.render();
  },
  render: function () {
    this.$scrollableContent = this.$('.scrollable-content');
    this.$pad = this.$scrollableContent.find('.pad');
    this.$loader = this.$scrollableContent.find('.loader');
    this.$realtime = this.$scrollableContent.find('.realtime');
    return this;
  },

  requestHistory: function (scrollTo) {
    if (this.historyLoading) {
      return;
    }
    this.historyLoading = true;

    this.toggleHistoryLoader('loading');

    // save the current first element identifier
    if (scrollTo === 'top') {
      var $nextTopElement = $('<div class="nextTopPosition"></div>').prependTo(this.$realtime);
    }

    // since
    var first = this.$realtime.find('.block[id]').first();
    var id = (!first || !first.length)
      ? null
      : first.attr('id');

    this.model.history(id, 'older', this.numberOfEventsToRetrieve, _.bind(function (data) {
      this.historyLoading = false;
      this.historyNoMore = !data.more;
      this.toggleHistoryLoader(data.more);

      this.parent.engine.insertTop(data.history);

      if (scrollTo === 'top') { // on manual request
        var targetTop = $nextTopElement.position().top;
        this.$el.scrollTop(targetTop - 8); // add a 8px margin
        $nextTopElement.remove();
      }

      if (scrollTo === 'bottom') {
        // on first focus history load
        this.model.trigger('scrollDown');
      }
    }, this));
  },
  toggleHistoryLoader: function (more) {
    app.trigger('resetDate');
    this.$loader.find('.help, .loading, .no-more').hide();
    this.$pad.removeClass('loading');
    if (more === 'loading') {
      // 'loading'
      this.$loader.find('.loading').show();
      this.$pad.addClass('loading');
    } else if (more) {
      // 'scroll to display more'
      this.$loader.find('.help').show();
    } else {
      // no more history indication
      this.$loader.find('.no-more').show();
    }
  },
  getLoaderTop: function () {
    return this.$loader.position().top;
  },
  getHistoryNoMore: function () {
    return this.historyNoMore;
  }

});
