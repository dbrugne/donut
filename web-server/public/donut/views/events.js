define([
  'jquery',
  'underscore',
  'backbone',
  'libs/donut-debug',
  'models/event',
  'moment',
  'client',
  'models/current-user',
  'views/window',
  '_templates'
], function ($, _, Backbone, donutDebug, EventModel, moment, client, currentUser, windowView, templates) {

  var debug = donutDebug('donut:events');

  var EventsView = Backbone.View.extend({

    template: templates['events.html'],

    events: {
      "click .go-to-top a"             : 'scrollTop',
      "click .go-to-bottom a"          : 'scrollDown',
      "shown.bs.dropdown .actions"     : 'onMessageMenuShow',
      "click .dropdown-menu .spammed"  : 'onMarkAsSpam',
      "click .dropdown-menu .unspam"   : 'onUnmarkAsSpam',
      "click .view-spammed-message"    : 'onViewSpammedMessage',
      "click .remask-spammed-message"  : 'onRemaskSpammedMessage',
      "click .message-form .enter"     : 'onEditMessage',
      "click .dropdown-menu .edited"   : 'showFormEditMessage',
      "dblclick .event .ctn "          : 'showFormEditMessage',
      "click .message-form .esc"       : 'hideFormEditMessage',
      'keydown .form-control': function(event) {
        if (event.which == 27) // escape
          this.hideFormEditMessage(event);
        if (event.which == 13) // enter
          this.onEditMessage(event);
        if (event.which == 38) // up arrow
          this.openNextFormEdit(event);
        if (event.which == 40) // down arrow
          this.openPrevFormEdit(event);
      }
    },

    historyLoading: false,

    historyNoMore: false,

    scrollTopTimeout: false,
    scrollVisibleTimeout: false,

    scrollWasOnBottom: true, // ... before unfocus (scroll position is not available when discussion is hidden (default: true, for first focus)

    keepMaxEventsOnCleanup: 500,

    initialize: function (options) {
      this.listenTo(this.model, 'windowRefocused', this.onScroll);
      this.listenTo(this.model, 'freshEvent', this.addFreshEvent);
      this.listenTo(this.model, 'viewed', this.onViewed);
      this.listenTo(this.model, 'messageSpam', this.onMarkedAsSpam);
      this.listenTo(this.model, 'messageUnspam', this.onMarkedAsUnspam);
      this.listenTo(this.model, 'messageEdit', this.onMessageEdited);
      this.listenTo(client, 'admin:message', this.onAdminMessage);

      debug.start('discussion-events' + this.model.getIdentifier());
      this.render();
      debug.end('discussion-events' + this.model.getIdentifier());
    },
    render: function () {
      // render view
      var html = this.template({
        model: this.model.toJSON(),
        time: Date.now()
      });
      this.$el.append(html);

      this.$scrollable = this.$el.find('.scrollable');
      this.$scrollableContent = this.$scrollable.find('.scrollable-content');
      this.$pad = this.$scrollableContent.find('.pad');
      this.$loader = this.$scrollableContent.find('.loader');
      this.$blank = this.$scrollableContent.find('.blank');
      this.$realtime = this.$scrollableContent.find('.realtime');

      this.$goToTop = this.$el.find('.go-to-top');
      this.$goToBottom = this.$el.find('.go-to-bottom');

      var that = this;
      this.$scrollable.on('scroll', $.proxy(function () {
        that.onScroll();
      }, this));

      this.scrollDown();
    },
    _remove: function () {
      this._scrollTimeoutCleanup();
      this.remove();
    },

    /*****************************************************************************************************************
     *
     * Scroll methods
     *
     *****************************************************************************************************************/
    onScroll: function (event) {
      // cleanup scroll timeout
      this._scrollTimeoutCleanup();

      var currentScrollPosition = this.$scrollable.scrollTop();
      var bottom = this._scrollBottomPosition();

      // toggle the "go to top and bottom" links
      if (bottom > 100) { // content should be longer than 100px of viewport to avoid link display for few pixels
        if (currentScrollPosition < 30)
          this.$goToTop.hide();
        else
          this.$goToTop.show();
        if (currentScrollPosition >= (bottom - 10)) // possible performance issue
          this.$goToBottom.hide().removeClass('unread');
        else
          this.$goToBottom.show();
      } else {
        // nothing to scroll, hide links
        this.$goToBottom.hide().removeClass('unread');
        this.$goToTop.hide();
      }

      var that = this;

      // hit the top and history could be loaded, setTimeout
      if (currentScrollPosition <= 0 && !this.historyNoMore) {
        this.toggleHistoryLoader('loading');
        this.scrollTopTimeout = setTimeout(function () {
          if (that.$scrollable.scrollTop() <= 0)
            that.requestHistory('top');
        }, 1500);
      }

      // everywhere
      this.scrollVisibleTimeout = setTimeout(function () {
        if (that.$scrollable.scrollTop() == currentScrollPosition)
          that.markVisibleAsViewed(); // scroll haven't change during timeout
      }, 2000);

    },
    _scrollTimeoutCleanup: function () {
      if (this.scrollTopTimeout) {
        clearInterval(this.scrollTopTimeout);
        this.scrollTopTimeout = false;
      }
      if (this.scrollVisibleTimeout) {
        clearInterval(this.scrollVisibleTimeout);
        this.scrollVisibleTimeout = false;
      }
    },
    _scrollBottomPosition: function () {
      var contentHeight = this.$scrollableContent.outerHeight(true);
      var viewportHeight = this.$scrollable.height();
      return contentHeight - viewportHeight;
    },
    isScrollOnBottom: function () {
      var bottom = this._scrollBottomPosition() - 10; // add a 10px margin
      return (this.$scrollable.scrollTop() >= bottom); // if gte current position, we are on bottom
    },
    scrollDown: function () {
      var bottom = this._scrollBottomPosition();
      this.$scrollable.scrollTop(bottom);
    },
    scrollTop: function () {
      var targetTop = this.$loader.position().top;
      this.$scrollable.scrollTop(targetTop - 8); // add a 8px margin
    },

    /*****************************************************************************************************************
     *
     * Visible elements detection
     *
     *****************************************************************************************************************/
    computeVisibleElements: function (callback) {
      var start = Date.now();

      var contentHeight = this.$scrollableContent.height();
      var topLimit = this.$scrollable.offset().top;
      var bottomLimit = topLimit + this.$scrollable.height();

      var $items = this.$scrollableContent.find('.block.message .event.unviewed');
      if (!$items.length)
        return debug('Not enough .event.unviewed to compute visible elements');
      $items.removeClass('visible topElement bottomElement first big'); // @debug

      // find the first visible element
      var $firstVisibleElement, firstVisibleIndex;
      var candidateIndex = Math.floor(topLimit * $items.length / contentHeight); // optimistic way to find -in theory- the closest
      var $candidateElement = $items.eq(candidateIndex);
      var visibility = this._isElementFullyVisibleInViewport(topLimit, bottomLimit, $candidateElement);
      debug($candidateElement.attr('id') + ' vib:', visibility);
      if (visibility == 'ok') {

        $firstVisibleElement = $candidateElement;
        firstVisibleIndex = candidateIndex;
        debug('we have visible element on first try');

      } else if (visibility == 'big') {

        // mark $candidateElement as top and stop
        $firstVisibleElement = $candidateElement;
        firstVisibleIndex = candidateIndex;
        debug('first is big');

      } else if (visibility == 'next') {

        // loop to find next 'ok'
        for (var nextIndex = candidateIndex + 1; nextIndex < $items.length; nextIndex++) {
          $nextElement = $items.eq(nextIndex);
          var _visibility = this._isElementFullyVisibleInViewport(topLimit, bottomLimit, $nextElement);
          if (_visibility == 'ok' || _visibility == 'big') {
            $firstVisibleElement = $nextElement;
            firstVisibleIndex = nextIndex;
            debug('$topCandidate found in next loop', $firstVisibleElement);
            break;
          } else {
            $candidateElement = $nextElement;
            candidateIndex = nextIndex;
          }
        }

      } else if (visibility == 'previous') {

        // loop to find previous 'ok'
        for (var previousIndex = candidateIndex - 1; previousIndex >= 0; previousIndex--) {
          $previousElement = $items.eq(previousIndex);
          var _visibility = this._isElementFullyVisibleInViewport(topLimit, bottomLimit, $previousElement);
          if (_visibility == 'ok' || _visibility == 'big') {
            $firstVisibleElement = $previousElement;
            firstVisibleIndex = previousIndex;
            break;
          } else {
            $candidateElement = $previousElement;
            candidateIndex = previousIndex;
          }
        }

      } else {
        // heu??
        debug(_visibility, 'heu');
      }

      // no element is fully visible
      if (!$firstVisibleElement) {
        debug('no element fully visible found');
        return callback([]);
      }

      // decorate list
      $firstVisibleElement.addClass('first');
      var $elements = this._listFullyVisibleElementsInViewport(topLimit, bottomLimit, $items, $firstVisibleElement, firstVisibleIndex);
      $elements[0].addClass('topElement');
      $elements[($elements.length - 1)].addClass('bottomElement');
      var visibleElementIds = [];
      $.each($elements, function () {
        $(this).addClass('visible');
        visibleElementIds.push($(this).attr('id'));
      });

      var duration = Date.now() - start;
      debug('Current scroll position is ' + (topLimit - 5) + '/' + (contentHeight - this.$scrollable.height()) + ' ... (in ' + duration + 'ms)');

      return callback(visibleElementIds);
    },
    _isElementFullyVisibleInViewport: function (topLimit, bottomLimit, $e) {
      var elementTop = $e.offset().top;
      var elementBottom = elementTop + $e.outerHeight();

      var v = '';
      if (elementTop <= topLimit && elementBottom >= bottomLimit) {
        // top is above topLimit && bottom is under bottomLimit => big element
        $e.addClass('big');
        v = 'big';
      } else if (elementTop >= bottomLimit) {
        // element is fully under viewport => find previous
        v = 'previous';
      } else if (elementTop > topLimit && elementBottom > bottomLimit) {
        // top is under topLimit && bottom is under bottomLimit => search for previous
        v = 'previous';
      } else if (elementBottom <= topLimit) {
        // element is fully above viewport => search for next
        v = 'next';
      } else if (elementTop <= topLimit) {
        // top is above topLimit => search for next
        v = 'next';
      } else if (elementTop > topLimit && elementBottom <= bottomLimit) {
        // top is under topLimit && bottom is above bottomLimit => ok
        v = 'ok';
      } else {
        v = 'error';
      }
      return v;
    },
    _listFullyVisibleElementsInViewport: function (topLimit, bottomLimit, $items, $element, index) {
      // determine fully visible element before and after $firstVisibleElement
      var list = [];
      list.push($element);

      var $e, v;

      // loop backward
      for (var previousIndex = index - 1; previousIndex >= 0; previousIndex--) {
        $e = $items.eq(previousIndex);
        v = this._isElementFullyVisibleInViewport(topLimit, bottomLimit, $e);
        if (v == 'ok') {
          list.unshift($e);
        } else {
          break;
        }
      }

      // loop forward
      for (var nextIndex = index + 1; nextIndex < $items.length; nextIndex++) {
        $e = $items.eq(nextIndex);
        v = this._isElementFullyVisibleInViewport(topLimit, bottomLimit, $e);
        if (v == 'ok') {
          list.push($e);
        } else {
          break;
        }
      }

      return list;
    },

    /*****************************************************************************************************************
     *
     * Size & cleanup
     *
     *****************************************************************************************************************/
    update: function () {
      this.cleanup();
    },
    cleanup: function (event) {
      if (this.isVisible() && !this.isScrollOnBottom())
        return; // no action when focused AND scroll not on bottom

      var realtimeLength = this.$realtime.find('.block').length;
      if (realtimeLength < 250) // not enough content, no need to cleanup
        return debug('cleanup ' + this.model.getIdentifier() + ' not enough event to cleanup: ' + realtimeLength);

      // reset history loader
      this.toggleHistoryLoader(true);

      // cleanup .realtime
      var length = this.$realtime.find('.block').length;
      var remove = (length > this.keepMaxEventsOnCleanup)
        ? (length - this.keepMaxEventsOnCleanup)
        : 0;
      if (remove > 0)
        this.$realtime.find('.block').slice(0, remove).remove();

      debug('cleanup discussion "' + this.model.getIdentifier() + '", with ' + length + ' length, ' + remove + ' removed');

      if (this.isVisible())
        this.scrollDown();
    },
    resize: function (viewportHeight) {
      if (typeof viewportHeight != "undefined") // was called on page resize by views/discussion, set the .events height
        this.$scrollable.height(viewportHeight);
      else // was called by view itself to adapt .blank height, get the current .events height
        viewportHeight = this.$scrollable.height();

      // blank heigth
      var blankHeight = 0;
      var currentContentHeight = this.$realtime.outerHeight();
      if (currentContentHeight > viewportHeight)
        blankHeight = 0;
      else
        blankHeight = viewportHeight - currentContentHeight;
      this.$blank.height(blankHeight);
    },

    /*****************************************************************************************************************
     *
     * Events rendering
     *
     *****************************************************************************************************************/
    onAdminMessage: function(data) {
      data = { data: data };
      data.data.avatar = 'cloudinary=v1409643461/rciev5ubaituvx5bclnz.png';
      data.data.username = 'Administrateur DONUT';
      data.data.is_admin = true;
      data.type = 'room:message';
      var model = new EventModel(data);
      this.addFreshEvent(model);
    },
    addFreshEvent: function (model) {
      // browser notification
      if (model.getGenericType() == 'message')
        windowView.triggerMessage(model, this.model);
      else if (this.model.get('type') == 'room' && model.getGenericType() == 'inout')
        windowView.triggerInout(model, this.model);

      // render a 'fresh' event in realtime and scrolldown
      debug.start('discussion-events-fresh-' + this.model.getIdentifier());
      // scrollDown only if already on bottom before DOM insertion
      var needToScrollDown = ((this.model.get('focused') == true && this.isScrollOnBottom()) || (this.model.get('focused') == false && this.scrollWasOnBottom));
      var previousElement = this.$realtime.find('.block:last').first();
      var newBlock = this._newBlock(model, previousElement);
      var html = this._renderEvent(model, newBlock);
      var element;
      if (!newBlock)
        element = $(html).appendTo(previousElement.find('.items')); // @bug : element is the .event in this case not the .block
      else
        element = $(html).appendTo(this.$realtime);

      // resize .blank
      this.resize();

      if (needToScrollDown)
        this.scrollDown();
      else
        this.$goToBottom.show().addClass('unread');

      debug.end('discussion-events-fresh-' + this.model.getIdentifier());
    },
    addBatchEvents: function (events, more) {
      if (events.length == 0)
        return;

      // render a batch of events (sorted in 'desc' order)
      debug.start('discussion-events-batch-' + this.model.getIdentifier());
      var $html = $('<div/>');
      var previousModel;
      var previousElement;
      _.each(events, _.bind(function (event) {
        var model = new EventModel(event);
        var newBlock = this._newBlock(model, previousElement);

        // inter-date block
        if (previousModel) {
          var newTime = moment(model.get('time'));
          var previousTime = moment(previousModel.get('time'));
          if (!newTime.isSame(previousTime, 'day')) {
            var dateHtml = templates['event/date.html']({
              time: previousModel.get('time'),
              datefull: previousTime.format('dddd Do MMMM YYYY')
            });
            previousElement = $(dateHtml).prependTo($html);
            newBlock = true;
          }
        }

        // render and insert
        var h = this._renderEvent(model, newBlock);
        if (!newBlock)
          $(h).prependTo(previousElement.find('.items')); // not define previousElement, remain the same .block
        else
          previousElement = $(h).prependTo($html);
        previousModel = model;
      }, this));

      $html.find('>.block').prependTo(this.$realtime);
      debug.end('discussion-events-batch-' + this.model.getIdentifier());

      // resize .blank
      this.resize();
    },
    _prepareEvent: function (model) {
      var data = model.toJSON();
      data.data = _.clone(model.get('data'));
      var message = data.data.message;

      if (model.getGenericType() === 'message')
        data.spammed = (model.get('spammed') === true);

      // avatar
      var size = (model.getGenericType() != 'inout')
        ? 30
        : 20;
      
      if (model.get("data").avatar)
        data.data.avatar = $.cd.userAvatar(model.get("data").avatar, size);
      if (model.get("data").by_avatar)
        data.data.by_avatar = $.cd.userAvatar(model.get("data").by_avatar, size);

      if (message) {
        // escape HTML
        message = _.escape(message);

        // linkify (before other decoration, will escape HTML)
        var o = (this.model.get('color'))
          ? {linkAttributes: {style: 'color: ' + this.model.get('color') + ';'}}
          : {};
        message = $.linkify(message, o);

        // mentions
        if (this.model.get('type') == 'room') {
          message = message.replace(
            /@\[([^\]]+)\]\(user:([^)]+)\)/g, // @todo put that in config
            '<a class="mention open-user-profile" data-username="$1" style="color: ' + this.model.get('color') + '">@$1</a>'
          );
        }

        // smileys
        message = $.smilify(message);

        data.data.message = message;
      }

      // images
      if (data.data.images) {
        var images = [];
        _.each(data.data.images, function (i) {
          i.url = $.cd.natural(i.path);
          i.thumbnail = $.cd.natural(i.path, 50, 50, 'fill'); // @important: use .path to obtain URL with file extension and avoid CORS errors
          images.push(i);
        });

        if (images && images.length > 0)
          data.data.images = images;
      }

      // date
      var dateObject = moment(model.get('time'));
      var diff = (Date.now() - dateObject.valueOf()) / 1000;
      var format;
      if (diff <= 86400) // 24h
        format = 'HH:mm';
      else if (diff <= 604800) // 7 days
        format = 'dddd';
      else if (2592000) // 1 month
        format = 'DD/MM';
      else // more than 1 year
        format = 'MM/YYYY';
      data.data.dateshort = dateObject.format(format);
      data.data.datefull = dateObject.format("dddd Do MMMM YYYY à HH:mm:ss");

      // rendering attributes
      data.unviewed = !!model.get('unviewed');

      return data;
    },
    _newBlock: function (newModel, previousElement) {
      var newBlock = false;
      if (!previousElement || previousElement.length < 1) {
        newBlock = true;
      } else {
        switch (newModel.getGenericType()) {
          case 'standard':
            newBlock = true;
            break;
          case 'inout':
            if (!previousElement.hasClass('inout'))
              newBlock = true;
            break;
          case 'message':
            if (!previousElement.hasClass('message') || previousElement.data('username') != newModel.get('data').username)
              newBlock = true;
            break;
        }
      }
      return newBlock;
    },
    _renderEvent: function (model, withBlock) {
      var data = this._prepareEvent(model);
      data.withBlock = withBlock || false;
      try {
        var template;
        switch (data.type) {
          case 'disconnected':
            template = templates['event/disconnected.html'];
            break;
          case 'user:online':
          case 'user:offline':
          case 'room:in':
          case 'room:out':
            template = templates['event/in-out-on-off.html'];
            break;
          case 'room:message':
          case 'user:message':
            template = templates['event/message.html'];
            break;
          case 'reconnected':
            template = templates['event/reconnected.html'];
            break;
          case 'room:deop':
            template = templates['event/room-deop.html'];
            break;
          case 'room:kick':
            template = templates['event/room-kick.html'];
            break;
          case 'room:ban':
            template = templates['event/room-ban.html'];
            break;
          case 'room:deban':
            template = templates['event/room-deban.html'];
            break;
          case 'room:op':
            template = templates['event/room-op.html'];
            break;
          case 'room:topic':
            template = templates['event/room-topic.html']; 
            break;
          case 'user:ban':
            template = templates['event/user-ban.html']; 
            break;
          case 'user:deban':
            template = templates['event/user-deban.html']; 
            break;
          default:
            return;
        }
        return template(data);
      } catch (e) {
        debug('Render exception, see below');
        debug(e);
        return false;
      }
    },

    /*****************************************************************************************************************
     *
     * Viewed management
     *
     *****************************************************************************************************************/
    markVisibleAsViewed: function () {
      if (!this.isVisible())
        return debug('markVisibleAsViewed: discussion/window not focused, do nothing'); // scroll could be triggered by freshevent event when window is not focused

      var that = this;
      this.computeVisibleElements(function (elements) {
        that.viewedElements(elements);
      });
    },
    viewedElements: function (elements) {
      if (elements.length)
        this.model.viewedElements(elements);
    },
    onViewed: function (data) {
      if (!data.events || !data.events.length)
        return;

      var selector = '';
      _.each(data.events, function (id) {
        if (selector != '')
          selector += ', ';
        selector += '#' + id;
      });

      $(selector).removeClass('unviewed');
    },
    isVisible: function () {
      if (!this.model.get('focused') || !windowView.focused)
        return false;

      return true;
    },

    /*****************************************************************************************************************
     *
     * Message actions menu
     *
     *****************************************************************************************************************/
    onMessageMenuShow: function (event) {
      var ownerUsername = '';
      if (this.model.get('owner'))
        ownerUsername = this.model.get('owner').get('username');
      var eventUsername = $(event.target).closest('[data-username]').data('username');
      var isMessageOwner = (ownerUsername === eventUsername);

      // check isEditable
      var isMessageCurrentUser = (currentUser.get('username') === eventUsername);
      var timeTarget = new Date(
        $(event.target)
          .parents('.event')
          .data('time')
      );
      var time = Date.now() - timeTarget;
      var isEditable = (time < (3600 * 1000));


      var isOp = this.model.currentUserIsOp();
      var isOwner = this.model.currentUserIsOwner();
      var isAdmin = this.model.currentUserIsAdmin();

      if (((!isOwner && !isAdmin && !isOp) || (isOp && isMessageOwner)) && (!isMessageCurrentUser || !isEditable )) {
        $(event.currentTarget).find('.dropdown-menu').dropdown('toggle');
        return;
      }
      var html = templates['events-dropdown.html']({
        data: {
          isOp: isOp,
          isOwner: isOwner,
          isAdmin: isAdmin,
          isMessageOwner: isMessageOwner,
          isMessageCurrentUser: isMessageCurrentUser,
          isEditable: isEditable
        }
      });
      $(event.currentTarget).find('.dropdown-menu').html(html);
    },
    onMarkAsSpam: function (event) {
      event.preventDefault();
      var parent = $(event.target).parents('.event');
      var roomName = this.model.get('name');
      var messageId = parent.attr('id');

      client.roomMessageSpam(roomName, messageId);
    },
    onUnmarkAsSpam: function (event) {
      event.preventDefault();
      var parent = $(event.target).parents('.event');
      var roomName = this.model.get('name');
      var messageId = parent.attr('id');
      parent.removeClass('viewed');

      var ctn = parent.find('.text') || parent.find('.image');
      ctn.find('.remask-spammed-message').remove();

      client.roomMessageUnspam(roomName, messageId);
    },
    onMarkedAsSpam: function (room) {
      var bottom = this.isScrollOnBottom();
      this.$('#' + room.event)
        .addClass('spammed')
        .find('.ctn')
        .first()
        .append('<div class="text-spammed">' + $.t('chat.message.text-spammed') + '</div>');
      if (bottom)
        this.scrollDown();
    },
    onMarkedAsUnspam: function (room) {
      var bottom = this.isScrollOnBottom();
      this.$('#' + room.event)
        .removeClass('spammed')
        .find('.ctn .text-spammed')
        .remove();

      this.$('#' + room.event).find('.remask-spammed-message').remove();
      if (bottom)
        this.scrollDown();
    },
    onViewSpammedMessage: function (event) {
      var bottom = this.isScrollOnBottom();
      event.preventDefault();
      var parent = $(event.target).parents('.event');
      var textSpammed = $(event.target).parents('.text-spammed');
      var ctn = parent.children('.ctn');
      parent.removeClass('spammed').addClass('viewed');
      textSpammed.remove();

      ctn.prepend('<a class="remask-spammed-message label label-danger">' + $.t('chat.message.text-remask') + '</a>');

      if (bottom)
        this.scrollDown();
    },
    onRemaskSpammedMessage: function (event) {
      var bottom = this.isScrollOnBottom();
      event.preventDefault();
      var parent = $(event.target).parents('.event');
      var ctn = parent.children('.ctn');
      parent.addClass('spammed').removeClass('viewed');
      parent
        .find('.ctn')
        .first()
        .append('<div class="text-spammed">' + $.t('chat.message.text-spammed') + '</div>');

      ctn.find('.remask-spammed-message').remove();

      if (bottom)
        this.scrollDown();
    },
    onEditMessage: function (event) {
      event.preventDefault();
      var parent = $(event.target).parents('.event');
      var form = parent.find('.form-control');
      var roomName = this.model.get('name');
      var messageId = parent.attr('id');
      var message = form.val();
      client.roomMessageEdit(roomName, messageId, message);

      this.hideFormEditMessage(event);

    },
    showFormEditMessage: function (event) {
      event.preventDefault();
      var bottom = this.isScrollOnBottom();

      // check isEditable
      var eventUsername = $(event.target).closest('[data-username]').data('username');
      var isMessageCurrentUser = (currentUser.get('username') === eventUsername);
      var timeTarget = new Date(
        $(event.target)
          .parents('.event')
          .data('time')
      );
      var time = Date.now() - timeTarget;
      var isEditable = (time < (3600 * 1000));

      var form = $(event.target).parents('.event').find('.message-form');

      if (isMessageCurrentUser && isEditable && !form.is(':visible')) {
        var text = $(event.target).parents('.event').find('.text').text();
        $(event.target).parents('.event').find('.text').hide();
        $(event.target).parents('.event').removeClass('has-hover');
        form.css('display', 'block');
        form.find('.form-control').val(text).focus();
        if (bottom)
          this.scrollDown();
      }
    },
    hideFormEditMessage: function (event) {
      event.preventDefault();
      $(event.target).parents('.message-form').hide();
      $(event.target).parents('.event').addClass('has-hover');
      $(event.target).parents('.ctn').find('.text').css('display', 'block');
    },
    onMessageEdited: function (event) {
      $('#'+event.event).find('.text').html(event.message);
    },
    openNextFormEdit: function (event) {
      var currentEventMessage = $(event.target).parents('.event');
      var currentBlockMessage = $(event.target).parents('.block .message');
      this.checkFormEdit('Next', currentEventMessage);



      if ((time) < (3600 * 1000)) {
        this.hideFormEditMessage(event);

      }
    },
    checkFormEdit: function(direction, currentEventMessage, currentBlockMessage) {
      if (direction === 'Next') {
        var prevEventMessage = currentEventMessage.prev();

        // Check time
        var dataTime = prevEventMessage.data('time');
        var time = Date.now() - new Date(dataTime);
      }
    },

    /*****************************************************************************************************************
     *
     * History management
     *
     *****************************************************************************************************************/
    requestHistory: function (scrollTo) {
      if (this.historyLoading)
        return;

      this.historyLoading = true;

      this.toggleHistoryLoader('loading');

      // save the current first element identifier
      if (scrollTo == 'top')
        var $nextTopElement = $('<div class="nextTopPosition"></div>').prependTo(this.$realtime);

      // since
      var first = this.$realtime
        .find('.block:first').first()
        .find('.event').first();
      var since = (!first || first.length < 1)
        ? null
        : first.data('time');

      var that = this;
      this.model.history(since, function (data) {
        that.addBatchEvents(data.history, data.more);

        if (scrollTo == 'top') { // on manual request
          var targetTop = $nextTopElement.position().top;
          that.$scrollable.scrollTop(targetTop - 8); // add a 8px margin
          $nextTopElement.remove();
        }

        if (scrollTo == 'bottom') // on first focus history load
          that.scrollDown();

        that.historyLoading = false;

        if (data.more === true)
          that.historyNoMore = false;
        else
          that.historyNoMore = true;
        that.toggleHistoryLoader(data.more);
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
    }

  });

  return EventsView;
});