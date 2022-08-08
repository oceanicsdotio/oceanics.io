## Quick start

This is our main web page, powered by NextJS. Most components are imported from the sibling component library `oceanics-io-ui`. The pages in `/pages` are data and control wrappers around these presentational elements.

Commands are intended to be run with `yarn workspace`. To build and launch a development version of the site locally run `yarn workspace oceanics-io-www develop`. 

Similarly, `build` will compile and bundle the TypeScript. Using `serve` will then serve the static production bundle. The `lint` command will run linting checks without eagerly compiling.

Documentation for our API is hosted at `/bathysphere.html`. This static file is built using `redoc`, the same way as above: `yarn workspace oceanics-io-www redoc` 


This contains a React component library and hooks to be re-used across applications. 

Installation is with `yarn workspace oceanics-io-ui install`. A post install command will cause the TypeScript compiler to do its thing. You can also run this manually with the local  `build` command.

For development, we use Storybook. The `start` command will launch a development server and open a browser. The `build-storybook` command create static HTML suitable for deployment to Netlify or another static site service.

You should not need to manually build this workspace.