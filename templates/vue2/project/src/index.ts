export * from './components';
import * as logics from './logics';

const LIBRARY_NAME = '{{LIBRARY_NAME}}';
const UtilsLogics = {
  install: (Vue) => {
    Vue.prototype.$library = Vue.prototype.$library || {};
    Vue.prototype.$library[LIBRARY_NAME] = {
      ...logics,
    };
  },
};

export {
  UtilsLogics,
};
