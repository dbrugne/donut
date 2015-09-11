db[ 'history-room' ].aggregate([
  { $match: { event: 'room:message' } },
  {
    $group: {
      _id: { month: { $month: '$time' }, day: { $dayOfMonth: '$time' } },
      count: { $sum: 1 }
    }
  }
])