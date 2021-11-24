## Quick start

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
