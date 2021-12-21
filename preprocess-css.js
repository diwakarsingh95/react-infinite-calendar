var sass = require('sass');

module.exports = function processSass(data, filename) {
  var result;
  result = sass.compile(filename).css;
  return result.toString('utf8');
};
