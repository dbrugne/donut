/**
 * Fix the Facebook Open Graph crawler language
 *
 * The fb_locale query param allows FB to force language (https://developers.facebook.com/docs/opengraph/guides/internationalization?locale=fr_FR)
 * But FB uses '_' language code ('fr_FR') where i18next uses '-' ('fr-FR')
 * This middleware add a force_locale query parameter based on fb_locale
 */
module.exports = function(req, res, next) {
  if (req.query && req.query['fb_locale'])
    req.query['force_locale'] = req.query['fb_locale'].replace('_', '-');

  return next();
};