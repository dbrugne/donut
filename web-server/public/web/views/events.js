var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var app = require('../models/app');
var donutDebug = require('../libs/donut-debug');
var EventModel = require('../models/event');
var date = require('../libs/date');
var i18next = require('i18next-client');
var client = require('../libs/client');
var EventsViewedView = require('./events-viewed');
var EventsHistoryView = require('./events-history');
var EventsSpamView = require('./events-spam');
var EventsEditView = require('./events-edit');
var windowView = require('./window');
var eventsEngine = require('../libs/events');

var debug = donutDebug('donut:events');

module.exports = Backbone.View.extend({
  template: require('../templates/events.html'),

  events: {
    'click .go-to-top a': 'scrollTop',
    'click .go-to-bottom a': 'scrollDown'
  },

  scrollTopTimeout: null,

  scrollVisibleTimeout: null,

  scrollWasOnBottom: true, // ... before unfocus (scroll position is not
                           // available when discussion is hidden (default:
                           // true, for first focus)

  initialize: function () {
    this.listenTo(this.model, 'change:focused', this.onFocusChange);
    this.listenTo(this.model, 'windowRefocused', this.onScroll);
    this.listenTo(this.model, 'freshEvent', this.addFreshEvent);
    this.listenTo(this.model, 'messageSent', this.scrollDown);
    this.listenTo(client, 'admin:message', this.onAdminMessage);

    this.render();

    this.eventsViewedView = new EventsViewedView({
      el: this.$scrollable,
      model: this.model
    });

    this.eventsHistoryView = new EventsHistoryView({
      el: this.$el,
      model: this.model
    });

    this.eventsSpamView = new EventsSpamView({
      el: this.$el,
      model: this.model
    });

    this.eventsEditView = new EventsEditView({
      el: this.$el,
      model: this.model
    });

    this.listenTo(this.eventsHistoryView, 'addBatchEvents', _.bind(function (data) {
      this.addBatchEvents(data.history, data.more);
    }, this));
    this.listenTo(app, 'scrollDown', _.bind(function () {
      this.scrollDown();
    }, this));
  },
  render: function () {
    // render view
    var modelJson = this.model.toJSON();
    if (modelJson.owner) {
      modelJson.owner = modelJson.owner.toJSON();
    }
    var created_at = (this.model.get('created_at'))
      ? date.dateTime(this.model.get('created_at'))
      : '';
    var created_time = (this.model.get('created_at'))
      ? date.shortTimeSeconds(this.model.get('created_at'))
      : '';
    var html = this.template({
      model: modelJson,
      created_at: created_at,
      created_time: created_time,
      isOwner: (this.model.get('type') === 'room' && this.model.currentUserIsOwner()),
      time: Date.now()
    });
    this.$el.append(html);

    this.$scrollable = this.$el;
    this.$scrollableContent = this.$scrollable.find('.scrollable-content');
    this.$realtime = this.$scrollableContent.find('.realtime');

    this.$goToTop = this.$('.go-to-top');
    this.$goToBottom = this.$('.go-to-bottom');

    var that = this;
    this.$scrollable.on('scroll', $.proxy(function () {
      that.onScroll();
    }, this));

    this.scrollDown();
  },
  _remove: function () {
    this.eventsViewedView.remove();
    this.eventsHistoryView.remove();
    this.eventsSpamView.remove();
    this.eventsEditView._remove();
    this._scrollTimeoutCleanup();
    this.remove();
  },
  onFocusChange: function () {
    if (this.model.get('focused')) {
      if (this.scrollWasOnBottom) {
        // will trigger visible element detection implicitly
        this.scrollDown();
      } else {
        this.onScroll();
      }
      this.scrollWasOnBottom = false;
    } else {
      // persist scroll position before hiding
      this.scrollWasOnBottom = this.isScrollOnBottom();
    }
  },
  isVisible: function () {
    return !(!this.model.get('focused') || !windowView.focused);
  },

  /** ***************************************************************************************************************
   *
   * Scroll methods
   *
   *****************************************************************************************************************/

  onScroll: function () {
    // cleanup scroll timeout
    this._scrollTimeoutCleanup();

    var currentScrollPosition = this.$scrollable.scrollTop();
    var bottom = this._scrollBottomPosition();

    // toggle the "go to top and bottom" links
    if (bottom > 100) { // content should be longer than 100px of viewport to avoid link display for
      // few pixels
      if (currentScrollPosition < 30) {
        this.$goToTop.hide();
      } else {
        this.$goToTop.show();
      }
      // possible performance issue
      if (currentScrollPosition >= (bottom - 10)) {
        this.$goToBottom.hide().removeClass('unread');
      } else {
        this.$goToBottom.show();
      }
    } else {
      // nothing to scroll, hide links
      this.$goToBottom.hide().removeClass('unread');
      this.$goToTop.hide();
    }

    var that = this;

    // hit the top and history could be loaded, setTimeout
    if (currentScrollPosition <= 0 && !this.eventsHistoryView.getHistoryNoMore()) {
      this.eventsHistoryView.toggleHistoryLoader('loading');
      this.scrollTopTimeout = setTimeout(function () {
        if (that.$scrollable.scrollTop() <= 0) {
          that.eventsHistoryView.requestHistory('top');
        }
      }, 1500);
    }

    // everywhere
    this.scrollVisibleTimeout = setTimeout(function () {
      // scroll haven't change until timeout
      if (that.$scrollable.scrollTop() === currentScrollPosition) {
        if (that.isVisible()) {
          that.eventsViewedView.markVisibleAsViewed();
        }
      }
    }, 2000);
  },
  _scrollTimeoutCleanup: function () {
    if (this.scrollTopTimeout) {
      clearInterval(this.scrollTopTimeout);
      this.scrollTopTimeout = null;
    }
    if (this.scrollVisibleTimeout) {
      clearInterval(this.scrollVisibleTimeout);
      this.scrollVisibleTimeout = null;
    }
  },
  _scrollBottomPosition: function () {
    var contentHeight = this.$scrollableContent.outerHeight(true);
    var viewportHeight = this.$scrollable.height();
    return contentHeight - viewportHeight;
  },
  isScrollOnBottom: function () {
    var scrollMargin = 10;
    if (this.eventsEditView.getMessageUnderEdition()) {
      scrollMargin = this.eventsEditView.getMessageUnderEdition().$el.height();
    }

    // add a 10px margin
    var bottom = this._scrollBottomPosition() - scrollMargin;

    // if get current position, we are on bottom
    return (this.$scrollable.scrollTop() >= bottom);
  },
  scrollDown: function () {
    var bottom = this._scrollBottomPosition();
    this.$scrollable.scrollTop(bottom);
  },
  scrollTop: function () {
    var targetTop = this.eventsHistoryView.getLoaderTop();
    this.$scrollable.scrollTop(targetTop); // add a 8px margin
  },

  /** **************************************************************************************************************
   *
   * Events rendering
   *
   *****************************************************************************************************************/
  onAdminMessage: function (data) {
    data = {data: data};
    data.data.avatar = '//res.cloudinary.com/roomly/image/upload/v1409643461/rciev5ubaituvx5bclnz.png'; // @todo : add avatar URL in configuration
    data.data.username = 'DONUT';
    data.data.is_admin = true;
    data.type = 'room:message';
    var model = new EventModel(data);
    this.addFreshEvent(model);
  },
  _newBlock: function (newModel, previousElement) {
    var newBlock = false;
    if (!previousElement || previousElement.length < 1) {
      newBlock = true;
    } else {
      switch (newModel.getGenericType()) {
        case 'hello':
        case 'standard':
          newBlock = true;
          break;
        case 'inout':
          if (!previousElement.hasClass('inout')) {
            newBlock = true;
          }
          break;
        case 'message':
          if (!previousElement.hasClass('message') || previousElement.data('userId') !== newModel.get('data').user_id) {
            newBlock = true;
          }
          break;
      }
    }
    return newBlock;
  },
  addFreshEvent: function (model) {
    // render a 'fresh' event in realtime and scrolldown
    debug.start('discussion-events-fresh-' + this.model.getIdentifier());
    // scrollDown only if already on bottom before DOM insertion
    var needToScrollDown = (
      (this.model.get('focused') === true && this.isScrollOnBottom()) ||
      (this.model.get('focused') === false && this.scrollWasOnBottom)
    );
    var previousElement = this.$realtime.find('.block:last').first();
    var newBlock = this._newBlock(model, previousElement);
    var html = eventsEngine.render(model, this.model);
    if (!newBlock) {
      // @bug : element is the .event in this case not the .block
      $(html).appendTo(previousElement.find('.items'));
    } else {
      html = eventsEngine.block(model, html);
      $(html).appendTo(this.$realtime);
    }

    if (needToScrollDown && !this.eventsEditView.getMessageUnderEdition()) {
      this.scrollDown();
    } else {
      this.$goToBottom.show().addClass('unread');
    }

    debug.end('discussion-events-fresh-' + this.model.getIdentifier());
  },
  addBatchEvents: function (events) {
    if (events.length === 0) {
      return;
    }

    // render a batch of events (sorted in 'desc' order)
    var $html = $('<div/>');
    var previousModel;
    var previousElement;
    _.each(events, _.bind(function (event) {
      var model = new EventModel(event);
      var newBlock = this._newBlock(model, previousElement);

      // inter-date block
      if (previousModel) {
        if (!date.isSameDay(model.get('time'), previousModel.get('time'))) {
          var dateFull = (date.diffInDays(previousModel.get('time')) === 0
              ? i18next.t('chat.message.today')
              : (date.diffInDays(previousModel.get('time')) === 1
                ? i18next.t('chat.message.yesterday')
                : (date.diffInDays(previousModel.get('time')) === 2
                  ? i18next.t('chat.message.the-day-before')
                  : date.longDate(previousModel.get('time'))
              )
            )
          );

          var dateHtml = require('../templates/event/date.html')({
            time: previousModel.get('time'),
            datefull: dateFull
          });
          previousElement = $(dateHtml).prependTo($html);
          newBlock = true;
        }
      }

      // render and insert
      var h = eventsEngine.render(model, this.model);
      if (!newBlock) {
        // not define previousElement, remain the same .block
        $(h).prependTo(previousElement.find('.items'));
      } else {
        h = eventsEngine.block(model, h);
        previousElement = $(h).prependTo($html);
      }
      previousModel = model;
    }, this));

    $html.find('>.block').prependTo(this.$realtime);
  },

  requestHistory: function (scrollTo) {
    this.eventsHistoryView.requestHistory(scrollTo);
  }
});
