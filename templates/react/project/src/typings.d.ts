declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}
declare module '*.module.less' {
  const classes: { [key: string]: string };
  export default classes;
}

export function ExtensionComponent(options?: ExtensionComponentOptions): (target: any) => void;