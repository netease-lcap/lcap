declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}
declare module '*.module.less' {
  const classes: { [key: string]: string };
  export default classes;
}

declare namespace extensions.react_library_demo {
  export interface ExtensionComponentOptions {
    type: 'pc' | 'h5',
    ideusage: {
      idetype?: 'element' | 'modal' | 'popover' | 'container' | string;
      [key: string]: any;
    }
  }

  export function ExtensionComponent(options?: ExtensionComponentOptions): (target: any) => void;
}
