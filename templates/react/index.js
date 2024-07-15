const { overloadBaseUI } = require('../../lib/actions');

module.exports = function (plop) {
  plop.setGenerator('component', require('./create-component'));
  plop.setGenerator('logic', require('../create-logic'));
  plop.setActionType('overloadBaseUI', overloadBaseUI);
};
