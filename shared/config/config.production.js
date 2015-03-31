var conf = require('./config.global');

conf.url = 'https://donut.me';
conf.fqdn = 'donut.me';
conf.mongo.url = 'mongodb://localhost:27017/donut';
conf.facebook.clientID = '328569463966926';
conf.facebook.clientSecret = 'e496a32d53acc5d7b855051fd15eb754';
conf.facebook.callbackURL = 'https://donut.me/login/facebook/callback';
conf.google.analytics.uid = 'UA-51674523-2';
conf.sessions.key = 'donut-pomelo.sid';
conf.keenio.projectId = '551a7fca672e6c55d34ecb65';
conf.keenio.readKey = '0a0ca35579719baa35f33913103b2af0d645d02fdb459019dcbe0a75d4f501e49393da636c703d4dcd09f16560caceb0c84653514478a41d0daec754a4e55fee54ae8191efad52e41dd4d128acbcab64624577f21edf1b601bf0516f2bcf1cf9d10efc4469a596333efa18ed1a5100f2';
conf.keenio.writeKey = '770913ae24250667f1df1f34706405cbf30a0c73441b0818e3cfdd07f0076c34b91da957ffb738f6d942372e2d758d1c99fac223f9fe5ef02395c4859120079ab68fcadfd0f9a493e70b40c86ef93e031782dfea978b681ce89a3bd4cda9f08734ef8503d80a26f7c20f7ce68977cbbd';

module.exports = conf;
