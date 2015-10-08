var conf = require('../../config');

module.exports = function (model, type, protocol, what) {
  var data = {};
  if (type === 'room') {
    var identifier = (!model.group_id)
      ? model.name
      : model.group_name + '/' + model.name;
    data = {
      url: protocol + '://' + conf.fqdn + '/r/' + identifier,
      uri: '#' + identifier,
      chat: protocol + '://' + conf.fqdn + '/!#r/' + identifier,
      join: protocol + '://' + conf.fqdn + '/r/join/' + identifier
    };
  }
  if (type === 'group') {
    data = {
      url: protocol + '://' + conf.fqdn + '/g/' + model.name,
      uri: '#' + model.name,
      chat: protocol + '://' + conf.fqdn + '/!#g/' + model.name,
      join: protocol + '://' + conf.fqdn + '/g/join/' + model.name
    };
  }
  if (type === 'user') {
    data = {
      url: protocol + '://' + conf.fqdn + '/u/' + model.username.toLocaleLowerCase(),
      uri: '#' + model.username,
      chat: protocol + '://' + conf.fqdn + '/!#u/' + model.username,
      discuss: protocol + '://' + conf.fqdn + '/u/join/' + model.username
    };
  }

  if (what && data[what]) {
    return data[what];
  }
  return data;
};