var $ = require('jquery');
var _ = require('underscore');
var async = require('async');
var Backbone = require('backbone');
var app = require('../libs/app');
var date = require('../libs/date');
var EventsDateView = require('./events-date');
var EventsHistoryView = require('./events-history');
var EventsSpamView = require('./events-spam');
var EventsEditView = require('./events-edit');
var windowView = require('./window');
var EventsEngine = require('../libs/events');
var currentUser = require('../libs/app').user;

module.exports = Backbone.View.extend({
  template: require('../templates/events.html'),

  events: {
    'shown.bs.dropdown .actions': 'onMessageMenuShow'
  },

  markAsViewedTimeout: null,

  scrollTopTimeout: null,

  chatmode: false,

  scrollWasOnBottom: true, // ... before unfocus (scroll position is not
                           // available when discussion is hidden (default:
                           // true, for first focus)

  initialize: function () {
    this.listenTo(app.client, 'preferences:update', _.bind(function () {
      if (currentUser.discussionMode() !== this.chatmode) {
        this.$realtime.toggleClass('compact');
        this.chatmode = currentUser.discussionMode();
      }
    }, this));
    this.chatmode = currentUser.discussionMode();
    this.listenTo(this.model, 'change:focused', this.onFocusChange);
    this.listenTo(this.model, 'windowRefocused', this.onScroll);
    this.listenTo(this.model, 'freshEvent', this.addFreshEvent);
    this.listenTo(this.model, 'messageSent', this.scrollDown);

    this.render();

    this.engine = new EventsEngine({
      model: this.model,
      currentUserId: currentUser.get('user_id'),
      el: this.$realtime
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
    modelJson.created_at = (this.model.get('created_at'))
      ? date.dateTime(this.model.get('created_at'))
      : '';
    modelJson.created_time = (this.model.get('created_at'))
      ? date.shortTimeSeconds(this.model.get('created_at'))
      : '';
    var html = this.template({
      chatmode: this.chatmode,
      model: modelJson,
      isOwner: (this.model.get('type') === 'room' && this.model.currentUserIsOwner())
    });
    this.$el.append(html);

    this.$scrollable = this.$el;
    this.$scrollableContent = this.$scrollable.find('.scrollable-content');
    this.$realtime = this.$scrollableContent.find('.realtime');

    this.$scrollable.on('scroll', _.bind(function () {
      this.onScroll();
    }, this));

    this.scrollDown();
  },
  _remove: function () {
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

    this.eventsDateView.scroll({
      currentScrollPosition: currentScrollPosition
    });

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

    // start timeout for mark as viewed detection
    this.markAsViewedTimeout = setTimeout(_.bind(function () {
      if (!this.isVisible()) {
        return;
      }
      this.model.markAsViewed();
    }, this), 2000); // 2s
  },
  _scrollTimeoutCleanup: function () {
    if (this.scrollTopTimeout) {
      clearInterval(this.scrollTopTimeout);
      this.scrollTopTimeout = null;
    }
    if (this.markAsViewedTimeout) {
      clearInterval(this.markAsViewedTimeout);
      this.markAsViewedTimeout = null;
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
  scrollTo: function (top, timing) {
    this.$scrollable.animate({
      scrollTop: top
    }, timing || 0);
  },
  markAsViewed: function () {
    var elt = this.$el.find('.block.unviewed');
    if (elt) {
      elt.fadeOut(1000, function () {
        elt.remove();
      });
    }
    this.eventsDateView.markAsViewed();
  },

  /** **************************************************************************************************************
   *
   * Events rendering
   *
   *****************************************************************************************************************/
  addFreshEvent: function (type, data) {
    // scrollDown only if already on bottom before DOM insertion
    var needToScrollDown = (
      (this.model.get('focused') === true && this.isScrollOnBottom()) ||
      (this.model.get('focused') === false && this.scrollWasOnBottom)
    );

    // render and insert
    this.engine.insertBottom(type, data);

    // scrollDown
    if (needToScrollDown && !this.eventsEditView.messageUnderEdition) {
      this.scrollDown();
    }
  },
  addBatchEvents: function (events) {
    this.engine.insertTop(events);
  },
  requestHistory: function (scrollTo) {
    this.eventsHistoryView.requestHistory(scrollTo);
  },
  onMessageMenuShow: function (event) {
    var $event = $(event.currentTarget).closest('.block.message');
    var userId = $event.closest('[data-user-id]').data('userId');
    var isMessageOwner = (userId && this.model.get('owner_id') === userId);

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
  },
  replaceDisconnectBlocks: function () {
    var $lastEventDisconnect = this.$el.find('.realtime div.block.disconnect:last');
    var that = this;

    async.whilst(
      function test () {
        return $lastEventDisconnect.length;
      },
      function action (callback) {
        var beforeLastDisconnectId = $lastEventDisconnect
          .prevAll('div.block')
          .not('.hello, .date')
          .first()
          .attr('id');

        var afterLastDisconnectId = $lastEventDisconnect
          .nextAll('div.block')
          .not('.hello, .date')
          .first()
          .attr('id');

        var $previousEvent = $lastEventDisconnect.prevAll('div.block').not('hello').first();

        that.model.history(beforeLastDisconnectId, afterLastDisconnectId, null, function (event) {
          if (!event.err) {
            that.engine.replaceLastDisconnectBlock($lastEventDisconnect, $previousEvent, event.history);
          }
          $lastEventDisconnect = that.$el.find('.realtime div.block.disconnect:last');
          return callback(null);
        });
      },
      function back (err) {
        return err;
      }
    );
  }
});
