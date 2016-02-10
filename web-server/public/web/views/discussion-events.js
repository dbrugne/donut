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

var debug = require('../libs/donut-debug')('donut:discussions');

module.exports = Backbone.View.extend({
  template: require('../templates/events.html'),
  templateSpinner: require('../templates/spinner.html'),
  templateUnviewed: require('../templates/event/block-unviewed.html'),

  events: {
    'mouseover .has-hover': 'mouseoverMessage',
    'click .mark-as-viewed': 'onClickToMarkAsViewed',
    'click .jumpto': 'onScrollToEvent'
  },

  numberOfEventsToRetrieve: 50,

  scrollTopTimeout: null,

  loading: false,

  scrollWasOnBottom: true, // ... before unfocus (scroll position is not
                           // available when discussion is hidden (default:
                           // true, for first focus)

  initialize: function () {
    this.listenTo(app.user, 'preferences:discussion:collapse:' + this.model.get('id'), this.onCollapse);
    this.listenTo(this.model, 'change:focused', this.onFocusChange);
    this.listenTo(this.model, 'change:unviewed', this.onMarkAsViewed);
    this.listenTo(this.model, 'windowRefocused', _.bind(function () {
      debug('windowRefocused', this.model.get('identifier'));
      this.updateDateBlocks();
      this.onScroll();
    }, this));
    this.listenTo(this.model, 'discussionUpdated', _.bind(function () {
      this.updateUnviewedBlock();
      this.updateUnviewedTopbar();
      this.updateDateBlocks();
    }, this));
    this.listenTo(this.model, 'freshEvent', this.addFreshEvent);
    this.listenTo(this.model, 'messageSent', this.onMessageSent);

    this.render();

    this.engine = new EventsEngine({
      model: this.model,
      currentUserId: app.user.get('user_id'),
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
    this.listenTo(this.model, 'resetDate', _.bind(function () {
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
    var spinner = this.templateSpinner({});
    var html = this.template({
      spinner: spinner,
      model: modelJson,
      collapsed: app.user.isDiscussionCollapsed(this.model.get('id')),
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
      // go focus
      this.onRefocus();
    } else {
      // go blur
      if (this.model.get('unviewed') === true) {
        this.model.markAsViewed();
      }

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

    debug('fetch from now to ', id);
    this.model.history(id, 'later', this.numberOfEventsToRetrieve, _.bind(function (data) {
      if (data.more === true) {
        // there are too many events to display, reset discussion DOM
        this.engine.reset();
      }

      this.engine.insertBottom(data.history);

      if (this.scrollWasOnBottom) {
        // will trigger visible element detection implicitly
        this.scrollDown();
      } else {
        this.onScroll();
      }
      this.scrollWasOnBottom = false;

      // @important after scroll
      this.updateUnviewedBlock();
      this.updateUnviewedTopbar();
      this.updateDateBlocks();
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
  },
  _scrollTimeoutCleanup: function () {
    if (this.scrollTopTimeout) {
      clearInterval(this.scrollTopTimeout);
      this.scrollTopTimeout = null;
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
  onScrollToEvent: function (event) {
    event.preventDefault();
    var elt = $(event.currentTarget);
    if (!elt.data('id')) {
      return;
    }

    var target = $('#unviewed-separator-' + elt.data('id'));
    if (!target) {
      return;
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
  onMarkAsViewed: function () {
    this.resetUnviewed();
  },
  updateUnviewedTopbar: function () {
    var reset = _.bind(function () {
      this.$unviewedContainer.html('').hide();
    }, this);

    if (!this.model.get('first_unviewed') || this.model.get('unviewed') !== true) {
      return reset();
    }

    var $firstUnviewed = $('#' + this.model.get('first_unviewed'));

    var isBlockAboveViewport;
    if ($firstUnviewed.length) {
      var scrollBottomPosition = this._scrollBottomPosition() + 15;
      var position = $firstUnviewed.position();
      isBlockAboveViewport = (position.top < scrollBottomPosition);
    }

    // only if $firstUnviewed doesn't exist OR is above the top limit
    var needTopBlock = !!(!$firstUnviewed || isBlockAboveViewport);
    if (!needTopBlock) {
      return reset();
    }

    this.$unviewedContainer.html(require('../templates/event/block-unviewed-top.html')({
      time: $firstUnviewed.data('time'),
      date: date.dayMonthTime($firstUnviewed.data('time')),
      id: this.model.get('first_unviewed')
    }));
    this.$unviewedContainer.show();
  },
  updateUnviewedBlock: function (isFresh) {
    if (this.model.get('unviewed') !== true || !this.model.get('first_unviewed')) {
      return;
    }
    if (isFresh && this.isVisible()) {
      // no block if discussion is visible for user
      return;
    }

    var $firstUnviewed = $('#' + this.model.get('first_unviewed'));
    if (!$firstUnviewed.length) {
      return;
    }
    var _target = $firstUnviewed;
    if ($firstUnviewed.prev().hasClass('user')) {
      _target = $firstUnviewed.prev();
    }

    this.$('.block.unviewed').remove();
    $(this.templateUnviewed({
      id: this.model.get('first_unviewed'),
      time: $firstUnviewed.data('time')
    })).insertBefore(_target);
  },
  resetUnviewed: function () {
    this.$scrollable.find('.block.unviewed').remove();
    this.$unviewedContainer.html('').hide();
  },
  onClickToMarkAsViewed: function () {
    this.model.markAsViewed();
  },
  onMessageSent: function () {
    this.scrollDown();
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

    this.updateUnviewedBlock(true);
    this.updateUnviewedTopbar();
    this.updateDateBlocks();

    // scrollDown
    if (needToScrollDown && !this.eventsEditView.messageUnderEdition) {
      this.scrollDown();
    }
  },
  mouseoverMessage: function (event) {
    var $event = $(event.currentTarget);
    if (this.eventsEditView.isEditable($event)) {
      $event.addClass('editable');
    } else {
      $event.removeClass('editable');
    }
  },

  /** **************************************************************************************************************
   *
   * Display mode
   *
   *****************************************************************************************************************/
  onCollapse: function (nowIsCollapsed) {
    if (nowIsCollapsed) {
      this.$realtime.addClass('collapsed');
      this.$scrollable.find('.files .collapse.in').removeClass('in');
      this.$scrollable.find('.files .collapse-toggle').addClass('collapsed');
    } else {
      this.$realtime.removeClass('collapsed');
      this.$scrollable.find('.files .collapse').addClass('in');
      this.$scrollable.find('.files .collapse-toggle').removeClass('collapsed');
    }
    this.scrollDown();
  }
});
