'use strict';
var _ = require('underscore');
var i18next = require('./i18next');

var quotesFr = [
  'Ravi de vous revoir %u',
  'Sympa de vous revoir %u',
  "Sympa d'être passé %u",
  'Un petit café %u ?',
  "Un p'tit donut %u ?",
  'Bien le bonjour %u',
  'Wesh wesh %u',
  'Salutations %u',
  'Ca fait un bail %u',
  'Yo %u',
  'Peace and love, %u',
  'Ahoy-Hoy %u !',
  'Quoi de neuf %u ?',
  'Buenos dias %u',
  'Enfin réveillé %u ?',
  'Salut %u, ça va ?',
  'La forme %u ?'
];

var quotesEn = [
  'Nice to see you, %u',
  'Good to see you, %u',
  'Pleased to see you, %u',
  'Want a donut %u?',
  'Good day, %u',
  'Hey, %u',
  'Greetings, %u',
  'Long time, %u',
  'Yo, %u',
  'Peace, %u',
  'Ahoy-Hoy %u!',
  "What's up, %u",
  'Buenos dias, %u',
  'So you woke up %u,',
  'Look fit today, %u',
  'Look good today, %u'
];

module.exports = function () {
  var quotes = (i18next.lng() === 'fr')
    ? quotesFr
    : quotesEn;

  return _.sample(quotes);
};
