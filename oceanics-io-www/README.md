## Quick start

This is our main web page, powered by NextJS. Most components are imported from the sibling component library `oceanics-io-ui`. The pages in `/pages` are data and control wrappers around these presentational elements.

Commands are intended to be run with `yarn workspace`. To build and launch a development version of the site locally run `yarn workspace oceanics-io-www develop`. 

Similarly, `build` will compile and bundle the TypeScript. Using `serve` will then serve the static production bundle. The `lint` command will run linting checks without eagerly compiling.

Documentation for our API is hosted at `/bathysphere.html`. This static file is built using `redoc`, the same way as above: `yarn workspace oceanics-io-www redoc` 
