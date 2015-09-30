var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var app = require('../models/app');
var date = require('../libs/date');
var EventsDateView = require('./events-date');
var EventsViewedView = require('./events-viewed');
var EventsHistoryView = require('./events-history');
var EventsSpamView = require('./events-spam');
var EventsEditView = require('./events-edit');
var windowView = require('./window');
var EventsEngine = require('../libs/events');

module.exports = Backbone.View.extend({
  template: require('../templates/events.html'),

  events: {
    'click .go-to-top a': 'scrollTop',
    'click .go-to-bottom a': 'scrollDown',
    'shown.bs.dropdown .actions': 'onMessageMenuShow'
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

    this.render();

    this.engine = new EventsEngine({
      model: this.model,
      el: this.$realtime
    });
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
    this.eventsDateView = new EventsDateView({
      el: this.$el
    });

    this.listenTo(this.eventsHistoryView, 'addBatchEvents', _.bind(function (data) {
      this.addBatchEvents(data.history, data.more);
    }, this));
    this.listenTo(app, 'scrollDown', _.bind(function () {
      this.scrollDown();
    }, this));

    this.listenTo(app, 'resetDate', _.bind(function () {
      this.eventsDateView.reset();
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

    this.$scrollable.on('scroll', _.bind(function () {
      this.onScroll();
    }, this));

    this.scrollDown();
  },
  _remove: function () {
    this.eventsViewedView.remove();
    this.eventsDateView.remove();
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

    this.eventsDateView.scroll({
      currentScrollPosition: currentScrollPosition
    });

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
//    console.log('scroll', contentHeight, viewportHeight, this.$el.height(), (contentHeight - viewportHeight));
    return contentHeight - viewportHeight;
  },
  isScrollOnBottom: function () {
    var scrollMargin = this.eventsEditView.getEditionHeight() || 10;

    // add a 10px margin
    var bottom = this._scrollBottomPosition() - scrollMargin;

    // if get current position, we are on bottom
    return (this.$scrollable.scrollTop() >= bottom);
  },
  scrollDown: function () {
    this.$scrollable.scrollTop(this.$scrollableContent.outerHeight(true));
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
  addFreshEvent: function (model) {
    // scrollDown only if already on bottom before DOM insertion
    var needToScrollDown = (
      (this.model.get('focused') === true && this.isScrollOnBottom()) ||
      (this.model.get('focused') === false && this.scrollWasOnBottom)
    );

    // render and insert
    this.engine.insertBottom(model);

    // scrollDown
    if (needToScrollDown && !this.eventsEditView.messageUnderEdition) {
      this.scrollDown();
    } else {
      this.$goToBottom.show().addClass('unread');
    }
  },
  addBatchEvents: function (events) {
    this.engine.insertTop(events);
  },
  requestHistory: function (scrollTo) {
    this.eventsHistoryView.requestHistory(scrollTo);
  },
  onMessageMenuShow: function (event) {
    var ownerUserId = '';
    if (this.model.get('owner')) {
      ownerUserId = this.model.get('owner').get('user_id');
    }
    var $event = $(event.currentTarget).closest('.block.message');
    var userId = $event.closest('[data-user-id]').data('userId');
    var isMessageOwner = (ownerUserId === userId);

    var isEditable = this.eventsEditView.isEditable($event);

    if (this.model.get('type') === 'room') {
      var isOp = this.model.currentUserIsOp();
      var isOwner = this.model.currentUserIsOwner();
      var isAdmin = this.model.currentUserIsAdmin();
    }

    if (((!isOwner && !isAdmin && !isOp) || (isOp && isMessageOwner)) && (!isEditable)) {
      $(event.currentTarget).find('.dropdown-menu').dropdown('toggle');
      return;
    }
    var html = require('../templates/events-dropdown.html')({
      data: {
        isOp: isOp,
        isOwner: isOwner,
        isAdmin: isAdmin,
        isMessageOwner: isMessageOwner,
        isEditable: isEditable
      }
    });
    $(event.currentTarget).find('.dropdown-menu').html(html);
  }
});
