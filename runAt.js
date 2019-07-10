const moment = require('moment');

const runAt = (dateToRun, fn) => {
  const offset = dateToRun.diff(moment());
  if (!offset) throw `did not recognize '${dateToRun}'`;
  return setTimeout(fn, offset);
};
module.exports = {
  runAt,
};
