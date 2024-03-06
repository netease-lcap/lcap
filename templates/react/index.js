module.exports = function (plop) {
  plop.setGenerator('component', require('./create-component'));
  plop.setGenerator('logic', require('./create-logic'));
};
