var debug = require('debug')('donut:server:input');
var sanitize = {
	'html': require('sanitize-html'),
	'caja': require('sanitize-caja')
};
var expressValidator = require('../../../shared/util/validator');

/**
 * Check for maximal length, sanitize and escape input
 * Return filtered string or empty string if too long or empty.
 * @param value
 * @param max
 * @return '' or filtered String
 */
module.exports.filter = function(value, maxLength) {
	// @todo : broken with mentions, replace @()[] in evaluated string with captured username before counting
	maxLength = maxLength || 512;
	if (!expressValidator.validator.isLength(value, 1, 512))
		return '';

	var filtered;
	filtered = value.replace('<3', '#!#!#heart#!#!#').replace('</3', '#!#!#bheart#!#!#'); // very common but particular case
	filtered = sanitize.html(filtered, {
		allowedTags        : {},
		allowedAttributes  : {}
	});
	filtered = sanitize.caja(filtered);
	filtered = value.replace('#!#!#heart#!#!#', '<3').replace('#!#!#bheart#!#!#', '</3');
	return filtered;
	/**
	 * Test string :
	 *
	 * words are :P >B) <3 </3 :) but style is still <strong>enabled</strong>, and <a href="http://google.com">links</a>. Or www.google.com and http://yahoo.fr/ with an XSS <script>alert('go go go!')</script>
	 */
};
