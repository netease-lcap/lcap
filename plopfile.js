module.exports = function (plop) {
    plop.setGenerator('component', require('./plop-templates/component-prompt'));
    plop.setGenerator('logic', require('./plop-templates/logic-prompt'));
    plop.setGenerator('annotation', require('./plop-templates/anno-prompt'));
};
