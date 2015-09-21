// i18next
var i18next = require('i18next-client');
var locales = require('../../../locales/fr/translation.json');
i18next.init({
  cookieName: 'donut.lng',
  resStore: locales
});

// moment
var moment = require('moment');
require('moment/locale/fr');
moment.locale(i18next.lng(), locales['fr']['translation']['moment']);

require('./index');
