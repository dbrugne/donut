// i18next
var i18next = require('i18next-client');
var locales = require('../../../locales/en/translation.json');
window.loc = locales;
i18next.init({
  cookieName: 'donut.lng',
  resStore: locales,
  debug: true
});
window.i18next = i18next;
window.t = i18next.t;

require('./outside');
