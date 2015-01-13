var appName = '';
var loggingLevel = '';
if (process.env.NODE_ENV == 'development') {
  appName = ['DONUT-WEB-DEV'];
} else if (process.env.NODE_ENV == 'test') {
  appName = ['DONUT-WEB-TEST'];
} else {
  appName = ['DONUT-WEB'];
}

/**
 * New Relic agent configuration.
 *
 * See lib/config.defaults.js in the agent distribution for a more complete
 * description of configuration variables and their potential values.
 */
exports.config = {
  /**
   * Array of application names.
   */
  app_name : appName,
  /**
   * Your New Relic license key.
   */
  license_key : '2c583b6130c4137ef9b96bebd2b569641ca8ff21',
  logging : {
    /**
     * Level at which to log. 'trace' is most useful to New Relic when diagnosing
     * issues with the agent, 'info' and higher will impose the least overhead on
     * production applications.
     */
    level : 'info',
    filepath : 'stdout'
  }
};
