// types/yaml.d.ts
// Only used for loading specification without intermediate representation.
declare module '*.yaml' {
    const value: any;
    export default value;
}
