### Web Assembly

The frontend uses Rust compiled to web assembly (WASM) in the frontend. To develop on WASM, you can get started with `rustup`, and `wasm-pack`:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
```

The `wasm-bindgen` tooling packages WASM to interact with Javascript, and can be served as static files by compiling [without a bundler](https://github.com/rustwasm/wasm-bindgen/tree/master/examples/without-a-bundler)

