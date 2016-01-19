'use strict';
module.exports = {
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
    },
    password: {
      max_password_tries: 5,
      max_password_time: 60 * 1000 // 1 min
    }
  },
  group: {
    default: {
      name: 'welcome'
    },
    password: {
      max_password_tries: 5,
      max_password_time: 60 * 1000 // 1 min
    }
  },
  mongodb: {
    uri: 'mongodb://localhost:27017/donut'
  },
  sessions: {
    key: 'donut.sid',
    secret: 'q4qsd65df45s4d5f45ds5fsf4s',
    ttl: 7 * 24 * 3600 // 1 week, in seconds
  },
  oauth: {
    secret: 'QmFzZTY0DQoNCkJhc2U2NCBpcyBhIGdlbmVyaWMgdGVybSBmb3IgYSBudW1iZ',
    expire: 7 * 24 * 3600 // 1 week, in seconds
  },
  verify: {
    secret: 'GwTiZFkkX8XoC4HqaUobXBhFUODxz7RNkYyIx8KCEsUkcEeir88UBX1AJBpyOiOI',
    expire: 7 * 24 * 3600 // 1 week, in seconds
  },
  email: {
    fake: 'donutmetest+__name__@gmail.com',
    from: {
      name: 'DONUT.me',
      email: 'hello@donut.me'
    },
    mailgun: {
      api_key: 'key-a302f604e9b1e7f1bca75beda26fd0c7',
      domain: 'donut.me'
    }
  },
  facebook: {
    'clientID': '400694556754416', // same for dev and test
    'clientSecret': '0ae02262f9a318add8b50378eaaf42ce', // same for dev and test
    'callbackURL': '',
    url: 'https://www.facebook.com/donutdotme'
  },
  twitter: {
    url: 'https://twitter.com/donut_fr'
  },
  cloudinary: {
    cloud_name: 'roomly',
    api_key: '962274636195222',
    api_secret: 'ayS9zUnK7sDxkme4sLquIPOmNVU'
  },
  google: {
    analytics: {
      uid: ''
    },
    recaptcha: {
      sitekey: '6LehPgMTAAAAAHWCuSkywS44bqrAaOW8qCJqol8q',
      secret: '6LehPgMTAAAAAF2-Q7uJSC-4w_CasRTzUYPgLSuQ'
    }
  },
  keenio: {
    projectId: '5519149e672e6c67853dfa0c',
    readKey: '5e0e70de4103b4df5ec43e599768ca6cefcf811c37d8591b7eeaf056bc8bf3597896ae0f808b0a3bb823b8ecc2d378ec7e410e66609ceb6932087cc668dda98f27afe9ff0978bb31fa9da0093f0950c941848c6faa52443ad49094ab1a3d70c6dfcee61f6d3a997d7294030ca65976b1',
    writeKey: '9a00f6651fe7567aa89adbfe2998119d69f783fcf50440ade384e52e269fbad754641d337c25943aa281ae80256d01a3a03a5276fd97f9ffacb228b7cd8c3ae3461b2fba13ac47b75aaa19924ddddee36a4c381bbe30cd98a75f42b75fbb2247b3fd7856f568d073f3d47cd85d01a92a'
  },
  parse: {
    applicationId: 'HLZpzyuliql75EGfdH1o9En9VwDIp4h8KmRHaQ9g',
    javaScriptKey: 'MMy5SXN7vCXgWogV3I4mGVhlTKLJ9tJSqq459lar',
    masterKey: '7c6ycSLa7gBHzQ9w2KMJBKoVWrVwBw8606x7PtVA',
    env: 'test' // scope Parse.com installations by env
  },
  i18n: {
    cookie: 'donut.lng'
  },
  chat: {
    message: {
      maxedittime: 5 // in minute
    }
  },
  notifications: {
    scheduler: 10, // seconds
    delay: 10, // seconds
    done: 1, // months
    types: {
      usermessage: {
        creation: 5 * 60 // 5mn
      },
      roommessage: {
        creation: 60 * 60 // 60mn
      },
      roomjoin: {
        creation: 5 * 60 // 5mn
      },
      groupinvite: {
        creation: 60 * 60 // 60mn
      }
    }
  }
};
