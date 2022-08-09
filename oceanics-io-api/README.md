# Quick start

This module is a build environment, so normally you won't run any commands directly. Local testing requires Netlify, which is installed from the parent module. Submodules (including this one) are built with `yarn workspaces foreach build`. 

The minimal example to get to running tests is:

```bash
yarn build
make run & # run Netlify dev stack, use another terminal
yarn api:test
```
