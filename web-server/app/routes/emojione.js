'use strict';
var express = require('express');
var router = express.Router();
var _ = require('underscore');

var emojione = require('emojione');
var emojioneList = require('emojione/emoji');

var tonePattern = /_tone[0-9]+$/;

var dictionary;
function getDictionary () {
  if (dictionary) {
    return dictionary;
  }

  var count = {
    total: Object.keys(emojioneList).length
  };

  dictionary = {};
  _.each(emojioneList, function (e, key) {
    if (!e.category) {
      return console.warn('emoji without category', e);
    }
    if (e.category === 'modifier') {
      return;
    }
    if (tonePattern.test(key)) {
      return;
    }
    if (!dictionary[e.category]) {
      dictionary[e.category] = [];
    }

    dictionary[e.category].push({
      name: e.name,
      shortname: e.shortname,
      img: emojione.toImage(e.shortname)
    });
  });

  count.categories = Object.keys(dictionary).length;
  count.emojis = 0;
  _.each(dictionary, function (c) {
    count.emojis += Object.keys(c).length;
  });

  count.categories_list = Object.keys(dictionary);

  console.log(count);
  return dictionary;
}

router.get('/emojione/:category', function (req, res) {
  if (!req.params || !req.params.category) {
    return res.json({err: 'category required'});
  }

  var dict = getDictionary();
  if (!dict[req.params.category]) {
    return res.json({err: 'unknown category'});
  }

  return res.json(dict[req.params.category]);
});

module.exports = router;
