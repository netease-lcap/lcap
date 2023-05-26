module.exports = function (plop) {
    plop.setGenerator('logic', require('./plop-templates/logic-prompt'));
    plop.setGenerator('component', require('./plop-templates/component-prompt'));
};
