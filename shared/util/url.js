module.exports = function (model, type, protocol, fqdn, what) {
  if (protocol === null) {
    protocol = window.location.protocol.replace(':', '');
  }
  if (fqdn === null) {
    fqdn = window.location.host;
  }
  var data = {};
  if (type === 'room') {
    var identifier = (!model.group_id)
      ? model.name
      : model.group_name + '/' + model.name;
    data = {
      url: protocol + '://' + fqdn + '/r/' + identifier,
      uri: '#' + identifier,
      chat: protocol + '://' + fqdn + '/!#r/' + identifier,
      join: protocol + '://' + fqdn + '/r/join/' + identifier
    };
  }
  if (type === 'group') {
    data = {
      url: protocol + '://' + fqdn + '/g/' + model.name,
      uri: '#' + model.name,
      chat: protocol + '://' + fqdn + '/!#g/' + model.name,
      join: protocol + '://' + fqdn + '/g/join/' + model.name
    };
  }
  if (type === 'user') {
    data = {
      url: protocol + '://' + fqdn + '/u/' + model.username.toLocaleLowerCase(),
      uri: '#' + model.username,
      chat: protocol + '://' + fqdn + '/!#u/' + model.username,
      discuss: protocol + '://' + fqdn + '/u/join/' + model.username
    };
  }

  if (what && data[what]) {
    return data[what];
  }
  return data;
};