var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');

module.exports = Backbone.View.extend({
  initialize: function (options) {
    this.listenTo(this.model, 'viewed', this.onViewed);
    this.render();
  },
  render: function () {
    this.$scrollable = this.$el;
    this.$scrollableContent = this.$scrollable.find('.scrollable-content');
    return this;
  },
  markVisibleAsViewed: function () {
    this.computeVisibleElements(_.bind(function (elements) {
      if (elements.length) {
        this.model.viewedElements(elements);
      }
    }, this));
  },
  computeVisibleElements: function (callback) {
    var contentHeight = this.$scrollableContent.height();
    var topLimit = this.$scrollable.offset().top;
    var bottomLimit = topLimit + this.$scrollable.height();

    var $items = this.$scrollableContent.find('.block.message .event.unviewed, .block.topic .event.unviewed');
    if (!$items.length) {
      return;
    }
    $items.removeClass('visible topElement bottomElement first big'); // @debug

    // find the first visible element
    var $firstVisibleElement, firstVisibleIndex, $nextElement, $previousElement;
    var candidateIndex = Math.floor(topLimit * $items.length / contentHeight); // optimistic way to find -in theory- the closest
    var $candidateElement = $items.eq(candidateIndex);
    var visibility = this._isElementFullyVisibleInViewport(topLimit, bottomLimit, $candidateElement);
    if (visibility === 'ok') {
      $firstVisibleElement = $candidateElement;
      firstVisibleIndex = candidateIndex;
    } else if (visibility === 'big') {
      // mark $candidateElement as top and stop
      $firstVisibleElement = $candidateElement;
      firstVisibleIndex = candidateIndex;
    } else if (visibility === 'next') {
      var _visibility;
      // loop to find next 'ok'
      for (var nextIndex = candidateIndex + 1; nextIndex < $items.length; nextIndex++) {
        $nextElement = $items.eq(nextIndex);
        _visibility = this._isElementFullyVisibleInViewport(topLimit, bottomLimit, $nextElement);
        if (_visibility === 'ok' || _visibility === 'big') {
          $firstVisibleElement = $nextElement;
          firstVisibleIndex = nextIndex;
          break;
        } else {
          $candidateElement = $nextElement;
          candidateIndex = nextIndex;
        }
      }
    } else if (visibility === 'previous') {
      // loop to find previous 'ok'
      for (var previousIndex = candidateIndex - 1; previousIndex >= 0; previousIndex--) {
        $previousElement = $items.eq(previousIndex);
        _visibility = this._isElementFullyVisibleInViewport(topLimit, bottomLimit, $previousElement);
        if (_visibility === 'ok' || _visibility === 'big') {
          $firstVisibleElement = $previousElement;
          firstVisibleIndex = previousIndex;
          break;
        } else {
          $candidateElement = $previousElement;
          candidateIndex = previousIndex;
        }
      }
    }

    // no element is fully visible
    if (!$firstVisibleElement) {
      return callback([]);
    }

    // decorate list
    $firstVisibleElement.addClass('first');
    var $elements = this._listFullyVisibleElementsInViewport(topLimit, bottomLimit, $items, $firstVisibleElement, firstVisibleIndex);
    $elements[ 0 ].addClass('topElement');
    $elements[ ($elements.length - 1) ].addClass('bottomElement');
    var visibleElementIds = [];
    $.each($elements, function () {
      $(this).addClass('visible');
      visibleElementIds.push($(this).attr('id'));
    });

    return callback(visibleElementIds);
  },
  _isElementFullyVisibleInViewport: function (topLimit, bottomLimit, $e) {
    var elementTop = $e.offset().top;
    var elementBottom = elementTop + $e.outerHeight() - 10; // accept a 10 px
                                                            // margin

    var v = '';
    if (elementTop <= topLimit && elementBottom >= bottomLimit) {
      // top is above topLimit && bottom is under bottomLimit => big element
      $e.addClass('big');
      v = 'big';
    } else if (elementTop >= bottomLimit) {
      // element is fully under viewport => find previous
      v = 'previous';
    } else if (elementTop > topLimit && elementBottom > bottomLimit) {
      // top is under topLimit && bottom is under bottomLimit => search for
      // previous
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
      if (v === 'ok') {
        list.unshift($e);
      } else {
        break;
      }
    }

    // loop forward
    for (var nextIndex = index + 1; nextIndex < $items.length; nextIndex++) {
      $e = $items.eq(nextIndex);
      v = this._isElementFullyVisibleInViewport(topLimit, bottomLimit, $e);
      if (v === 'ok') {
        list.push($e);
      } else {
        break;
      }
    }

    return list;
  },
  onViewed: function (data) {
    if (!data.events || !data.events.length) {
      return;
    }

    var selector = _.map(data.events, function (id) {
      return '#' + id;
    });
    this.$scrollableContent.find(selector.join(',')).removeClass('unviewed');
  }
});
