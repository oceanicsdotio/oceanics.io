## Quick start

This is our main web page. It was previously powered by GatsbyJS, but has since been switched to use NextJS.

All components are imported from the sibling component library `oceanics-io-ui`. The pages in `/src` are data and control wrappers around these presentational elements.

Commands are intended to be run with yarn workspaces. To build and launch a development version of the site locally run `yarn workspace oceanics-io-www`. Similarly, `build` will compile and bundle the TypeScript. Using `serve` will then serve the static production bundle. The `lint` command will run linting checks without eagerly compiling.