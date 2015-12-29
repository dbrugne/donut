var $ = require('jquery');
var _ = require('underscore');
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

var debug = require('../libs/donut-debug')('donut:discussions');

module.exports = Backbone.View.extend({
  template: require('../templates/events.html'),

  events: {
    'shown.bs.dropdown .actions': 'onMessageMenuShow',
    'click .mark-as-viewed': 'onMarkAsViewed',
    'click .jumpto': 'onScrollToEvent'
  },

  markAsViewedDelay: 4000,
  markAsViewedTimeout: null,

  numberOfEventsToRetrieve: 50,

  scrollTopTimeout: null,

  chatmode: false,

  loading: false,

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
    this.listenTo(this.model, 'windowRefocused', _.bind(function () {
      debug('windowRefocused', this.model.get('identifier'));
      this.onScroll();
    }, this));
    this.listenTo(this.model, 'freshEvent', this.addFreshEvent);
    this.listenTo(this.model, 'messageSent', this.scrollDown);

    this.render();

    this.engine = new EventsEngine({
      model: this.model,
      currentUserId: currentUser.get('user_id'),
      el: this.$realtime
    });
    this.eventsHistoryView = new EventsHistoryView({
      el: this.$('.events'),
      model: this.model,
      parent: this
    });
    this.eventsSpamView = new EventsSpamView({
      el: this.$('.events'),
      model: this.model
    });
    this.eventsEditView = new EventsEditView({
      el: this.$('.events'),
      model: this.model
    });
    this.eventsDateView = new EventsDateView({
      el: this.$el // at this point, ".discussion"
    });

    this.listenTo(this.model, 'scrollDown', this.scrollDown);
    this.listenTo(app, 'resetDate', _.bind(function () {
      this.eventsDateView.reset();
    }, this));

    // everything is ready
    debug('first focus', this.model.get('identifier'));
    this.eventsHistoryView.requestHistory('bottom');
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
    this.$('.events').append(html);

    this.$scrollable = this.$('.events');
    this.$scrollableContent = this.$scrollable.find('.scrollable-content');
    this.$realtime = this.$scrollableContent.find('.realtime');
    this.$unviewedContainer = this.$('.ctn-unviewed');

    this.$scrollable.on('scroll', _.bind(function () {
      this.onScroll();
    }, this));
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
      this.onRefocus();
    } else {
      // persist scroll position before hiding
      this.scrollWasOnBottom = this.isScrollOnBottom();
    }
  },
  onRefocus: function () {
    // triggered on discussion focus AND on reconnect (when Backbone.history is restarted)
    debug('refocus', this.model.get('identifier'));
    var last = this.$realtime.find('.block[id]').last();
    var id = (!last || !last.length)
      ? null
      : last.attr('id');

    this.historyLoading = true; // @todo add spinner
    debug('fetch from now to ', id);
    this.model.history(id, 'later', this.numberOfEventsToRetrieve, _.bind(function (data) {
      if (data.more === true) {
        // there are too many events to display, reset discussion DOM
        this.engine.reset();
      }

      this.engine.insertBottom(data.history);
      this.updateDateBlocks();
      this.updateUnviewedBlocks();

      if (this.scrollWasOnBottom) {
        // will trigger visible element detection implicitly
        this.scrollDown();
      } else {
        this.onScroll();
      }
      this.scrollWasOnBottom = false;
    }, this));
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
    console.log('onscroll');
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
      console.log('timedout');
      if (!this.isVisible()) {
        console.log('avoid');
        return;
      }
      this.model.markAsViewed();
    }, this), this.markAsViewedDelay);
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
    debug('scroll down', this.model.get('identifier'));
    this.$scrollable.scrollTop(this.$scrollableContent.outerHeight(true));
  },
  scrollTo: function (top, timing) {
    this.$scrollable.animate({
      scrollTop: top
    }, timing || 0);
  },
  /**
   * Function called to hide the unviewed block on top of the discussion
   * and the unread messages inside the discussion
   */
  hideUnviewedBlocks: function () {
    var insideBlock = this.$('.events').find('.block.unviewed');
    var topBlock = this.$('.date-ctn .ctn-unviewed');
    if (insideBlock) {
      insideBlock.fadeOut(1000, function () {
        insideBlock.remove();
      });
    }
    if (topBlock) {
      topBlock.find('.unviewed-top').fadeOut(1000, function () {
        topBlock.html('');
      });
    }
  },
  onScrollToEvent: function (event) {
    event.preventDefault();
    var elt = $(event.currentTarget);
    if (!elt.data('id')) {
      return this.onMarkAsViewed();
    }

    var target = $('#unviewed-separator-' + elt.data('id'));
    if (!target) {
      return this.onMarkAsViewed();
    }

    this.scrollTo(target.position().top - 31, 1000); // 31 = height of top unview block
  },

  /** ***************************************************************************************************************
   *
   * Special blocks method
   *
   *****************************************************************************************************************/

  updateDateBlocks: function () {
    this.$('.events').find('.block.date').removeClass(function (index, css) {
      return (css.match(/today|yesterday/g) || []).join(' ');
    }).addClass('current'); // always display dates as dddd Do MMMM YYYY

    var _date = new Date();
    var today = _date.getFullYear() + '-' + (_date.getMonth() + 1) + '-' + _date.getDate();

    _date.setDate(_date.getDate() - 1);
    var yesterday = _date.getFullYear() + '-' + (_date.getMonth() + 1) + '-' + _date.getDate();

    this.$('.events').find('.block.date[data-date="' + today + '"]').addClass('today');
    this.$('.events').find('.block.date[data-date="' + yesterday + '"]').addClass('yesterday');
  },
  updateUnviewedBlocks: function () {
    var id = this.model.get('first_unviewed');
    var target = $('#' + id);

    if (!target.length) {
      return;
    }
    if (currentUser.get('user_id') === target.data('userId')) {
      return;
    }

    // topbar
    this.$unviewedContainer.html(require('../templates/event/block-unviewed-top.html')({
      time: target.data('time'),
      date: date.dayMonthTime(target.data('time')),
      id: id
    }));

    // look for a previous new message separator, if not, insert one after "event"
    if (this.$('.events .block.unviewed').length === 0) {
      var tpl = require('../templates/event/block-unviewed.html');
      $(tpl({
        time: target.data('time'),
        id: id
      })).insertBefore(target);
    }
  },
  onMarkAsViewed: function () {
    this._scrollTimeoutCleanup();
    this.model.markAsViewed();
  },

  /** **************************************************************************************************************
   *
   * Events rendering
   *
   *****************************************************************************************************************/
  addFreshEvent: function (type, data) {
    if (this.model.get('focused') !== true) {
      // render realtime event only if discussion is focused
      return;
    }

    // scrollDown only if already on bottom before DOM insertion
    var needToScrollDown = (
      (this.model.get('focused') === true && this.isScrollOnBottom()) ||
      (this.model.get('focused') === false && this.scrollWasOnBottom)
    );

    // render and insert
    this.engine.insertBottom([{type: type, data: data}]);
    this.updateUnviewedBlocks();

    // scrollDown
    if (needToScrollDown && !this.eventsEditView.messageUnderEdition) {
      this.scrollDown();
    }
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
  }
});
