## Quick start

There are three commands in `package.json`. You can:
    - `yarn workspace oceanics-io-fcns clean` to clear the `dist` directory
    - `yarn workspace oceanics-io-fcns copyfiles` to clear and copy in pre-built web assembly
    - `yarn workspace oceanics-io-fcns yarn build` to do all of the above plus compile functions from `src` to `dist`

This assumes that the web assembly package has already been created and copied over to `src` using `yarn api:build` from the parent package.

This module is just a build environment, so normally you won't run these commands directly. Local testing requires a Netlify environment, which is controlled from the parent module. Submodules (including this one) are built with `yarn workspaces build`. 

The flow to build sibling dependencies, compile from TypeScript, and test Auth API (for example) is therefore:

```bash
yarn api:build && yarn workspace oceanics-io-fcns build
yarn netlify  # run Netlify dev stack, use another terminal
yarn api:test
```
