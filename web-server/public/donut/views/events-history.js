'use strict';
define([
  'jquery',
  'underscore',
  'backbone',
  'models/app'
], function ($, _, Backbone, app) {
  var HistoryView = Backbone.View.extend({

    historyLoading: false,

    historyNoMore: false,

    initialize: function (options) {
      this.render();
    },
    render: function () {
      this.$scrollableContent = this.$el.find('.scrollable-content');
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
      var first = this.$realtime
        .find('.block:first').first()
        .find('.event').first();
      var since = (!first || first.length < 1)
        ? null
        : first.data('time');

      var that = this;
      this.model.history(since, function (data) {
        that.trigger('addBatchEvents', {
          history: data.history,
          more: data.more
        });

        that.historyLoading = false;
        that.historyNoMore = !data.more;
        that.toggleHistoryLoader(data.more);

        if (scrollTo === 'top') { // on manual request
          var targetTop = $nextTopElement.position().top;
          that.$el.scrollTop(targetTop - 8); // add a 8px margin
          $nextTopElement.remove();
        }

        if (scrollTo === 'bottom') {
          // on first focus history load
          app.trigger('scrollDown');
        }
      });
    },
    toggleHistoryLoader: function (more) {
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

  return HistoryView;
});
