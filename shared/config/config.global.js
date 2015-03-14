var conf = module.exports = {

  /**
   * The root domain used by the instance. This FQDN serve the web content.
   * Donut will automatically use the 'ws.'+fqdn subdomain for websocket connections.
   *
   * The value of this field is added as 'domain' for session cookie
   *
   * @string
   */
  url: '',
  fqdn: '',

  debug: {
    cookie: 'donut.debug'
  },
  less: {
    force: false
  },
  room: {
    default: {
      color: '#fc2063'
    }
  },
  mongo: {
    'url' : ''
  },
  sessions: {
    key: 'donut.sid',
    secret: 'q4qsd65df45s4d5f45ds5fsf4s',
    ttl: 7*24*3600 // 1 week, in seconds
  },
  email: {
    from: {
      name: "DONUT.me",
      email: "hello@donut.me"
    },
    port: ''
  },
  facebook: {
    'clientID' 		: '328600083963864', // your App ID
    'clientSecret' 	: '89a61eab36ab0971e0400f9f3934addb', // your App Secret
    'callbackURL' 	: ''
  },
  cloudinary: {
    cloud_name: 'roomly',
    api_key: '962274636195222',
    api_secret: 'ayS9zUnK7sDxkme4sLquIPOmNVU'
  },
  google: {
    analytics: {
      uid: ''
    }
  },
  i18n: {
    cookie: 'donut.lng'
  }
};