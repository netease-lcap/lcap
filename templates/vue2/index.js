const { overloadBaseUI } = require('../../lib/actions');

module.exports = function (plop) {
  plop.setActionType('overloadBaseUI', overloadBaseUI);
  plop.setGenerator('component', require('./create-component'));
  plop.setGenerator('logic', require('../create-logic'));
};
