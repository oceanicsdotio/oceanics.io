# Quick start

The application uses Rust compiled to web assembly (WASM). [`Cargo.toml`](/Cargo.toml) describes the Rust crate dependencies. Transpiled bindings should always be available in the workspace if using `make`.

You'll need `rustup` and `wasm-pack`, and then can build with:

```bash
make install-rustup
make install-wasm-pack
make oceanics-io-wasm-node
make oceanics-io-wasm-www
```
