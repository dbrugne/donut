var conf = module.exports = {
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
    mailgun: {
      api_key: 'key-a302f604e9b1e7f1bca75beda26fd0c7',
      domain: 'donut.me'
    }
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