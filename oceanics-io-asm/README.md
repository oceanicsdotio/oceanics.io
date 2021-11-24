## Quick start

The frontend uses Rust compiled to web assembly (WASM). [`Cargo.toml`](/Cargo.toml) describes the Rust crate dependencies. You'll need `rustup` and `wasm-pack`:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
cargo install wasm-pack
```

You need to set the environment variables `SPACES_ACCESS_KEY` and `SPACES_SECRET_KEY` to access data from secure S3 buckets. Locally we use a git-ignored `.envrc` file.

JavaScript dependencies and builds are managed with `yarn`. Deploy a local version to port `8000` with `yarn develop`. See [`package.json`](/package.json) for build scripts, etc.

When running `yarn build` or `yarn develop` GatsbyJS automatically triggers compilation. Errors in the code will cause the entire build to fail. There is no hot loading or automatic recompiling, as described in [`/gatsby-node.js`](/gatsby-node.js).  The build produces the `neritics` JavaScript module.

You can also use `yarn compile` to build.
