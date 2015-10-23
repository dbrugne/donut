module.exports = function (model, type, what) {
  var data = {};
  if (type === 'room') {
    var identifier = (!model.group_name)
      ? model.name
      : model.group_name + '/' + model.name;
    data = {
      url: '/r/' + identifier,
      uri: '#' + identifier,
      chat: '/!#' + identifier,
      join: '/r/join/' + identifier
    };
  }
  if (type === 'group') {
    data = {
      url: '/g/' + model.name,
      uri: '#g/' + model.name,
      chat: '/!#g/' + model.name,
      join: '/g/join/' + model.name
    };
  }
  if (type === 'user') {
    data = {
      url: '/u/' + model.username.toLocaleLowerCase(),
      uri: '!#u/' + model.username,
      chat: '/!#u/' + model.username,
      discuss: '/u/discuss/' + model.username
    };
  }

  if (what && data[what]) {
    return data[what];
  }
  return data;
};
