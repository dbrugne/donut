var i18next = require('i18next');
var conf = require('../config/index');

// http://i18next.com/pages/doc_init.html
i18next.init({
  resGetPath: require('path').resolve(__dirname, '..', 'locales/__lng__/__ns__.json'),
  resSetPath: require('path').resolve(__dirname, '..', 'locales/__lng__/__ns__.json'),
  cookieName: conf.i18n.cookie,
  saveMissing: true
});

// hotfix for Express 4.0 compliance, dynamicHelper no longer exist since 3.0
i18next.registerAppHelper({});

module.exports = i18next;