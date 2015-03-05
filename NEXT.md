# Things to do on next deploy

* db['history-room'].update({}, { $unset: { 'received': ""} }, {multi: true})
* db['history-one'].update({}, { $unset: { 'received': ""} }, {multi: true})