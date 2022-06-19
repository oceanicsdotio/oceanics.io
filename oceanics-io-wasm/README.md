## Quick start

The frontend uses Rust compiled to web assembly (WASM). [`Cargo.toml`](/Cargo.toml) describes the Rust crate dependencies. You'll need `rustup` and `wasm-pack`:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
cargo install wasm-pack
```

Transpiled bindings *should* always be available in the workspace.
