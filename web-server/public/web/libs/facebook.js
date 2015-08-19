/**
 * Asynchronous Facebook Javascript SDK loading
 *
 * @doc: https://developers.facebook.com/docs/javascript/quickstart/v2.4
 */

module.exports = function(callback) {

  window.fbAsyncInit = function() {
    // @doc: https://developers.facebook.com/docs/javascript/reference/FB.init/v2.4
    window.FB.init({
      appId      : window.facebook_app_id,
      status     : false,
      xfbml      : false,
      version    : 'v2.4'
    });
    callback(window.FB);
  };
  (function(d, s, id){
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) {return;}
    js = d.createElement(s); js.id = id;
    // @todo: load correct language
    js.src = "//connect.facebook.net/fr_FR/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
  }(document, 'script', 'facebook-jssdk'));

};
