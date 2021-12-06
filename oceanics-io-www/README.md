## Quick start

This is our main web page, previously powered by NextJS. All components are imported from the sibling component library `oceanics-io-ui`. The pages in `/pages` are data and control wrappers around these presentational elements.

Commands are intended to be run with yarn workspaces. To build and launch a development version of the site locally run `yarn workspace oceanics-io-www develop`. Similarly, `build` will compile and bundle the TypeScript. Using `serve` will then serve the static production bundle. The `lint` command will run linting checks without eagerly compiling.

The frontend uses Rust compiled to web assembly (WASM). [`Cargo.toml`](/Cargo.toml) describes the Rust crate dependencies. You'll need `rustup` and `wasm-pack`:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
cargo install wasm-pack
```

Builds are managed with `yarn`. Run `yarn build` for both NodeJS and bundlers. Transpiled bindings should always available in the workspace.