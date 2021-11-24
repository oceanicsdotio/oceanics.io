## Quick start

This is our main web page. It was previously powered by GatsbyJS, but has since been switched to use NextJS.

All components are imported from the sibling component library `oceanics-io-ui`. The pages in `/src` are data and control wrappers around these presentational elements.

Commands are intended to be run with yarn workspaces. To build and launch a development version of the site locally run `yarn workspace oceanics-io-www`. Similarly, `build` will compile and bundle the TypeScript. Using `serve` will then serve the static production bundle. The `lint` command will run linting checks without eagerly compiling.

The frontend uses Rust compiled to web assembly (WASM). [`Cargo.toml`](/Cargo.toml) describes the Rust crate dependencies. You'll need `rustup` and `wasm-pack`:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
cargo install wasm-pack
```

Builds are managed with `yarn` and `make`. The build targets are described in the `makefile`, and running `yarn build` will compile for both NodeJS and bundlers (e.g. webpack). This also runs as a pre-install hook, so that the compiled bindings are always available in the workspace. 

If you need to manually do this from the top level directory, try:
```bash
yarn workspace oceanics-io-asm build
```

Run `yarn doc` to build HTML documentation pages of the Rust crate describing the API. See [`package.json`](/package.json) for these and other build scripts.

To use this as a library from a sibling package, use `wasm-pack-plugin`. 
