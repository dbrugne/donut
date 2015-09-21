// i18next
var i18next = require('i18next-client');
var locales = require('../../../locales/en/translation.json');
i18next.init({
  cookieName: 'donut.lng',
  resStore: locales
});

// moment
var moment = require('moment');
// require('moment/locale/en'); // en language is implicitly loaded by moment
moment.locale(i18next.lng(), locales['en']['translation']['moment']);

require('./index');
