## Quick start

There are three commands. You can:
    - `yarn workspace oceanics-io-fcns clean` to clear the `dist` directory
    - `yarn copyfiles` to clear and copy in pre-built web assembly
    - `yarn build` to do all of the above plus compile functions from `src` to `dist`

This assumes that the web assembly package has already been created and copied over to `src` using `yarn api:build` from the parent package. 

This module is just a build environment, so normally you won't run these commands directly. Local testing requires a Netlify environment, which is controlled from the parent module. Submodules are built with `yarn workspaces build`. 

The flow to test API changes is therefore:

```bash
yarn api:build  # build WASM package from sibling
yarn api:spec  # convert API spec to json
yarn workspace oceanics-io-fcns build  # build functions
yarn netlify  # run Netlify dev stack
yarn api:test -- --grep="Auth API" # mocha tests, with optional filter
```
