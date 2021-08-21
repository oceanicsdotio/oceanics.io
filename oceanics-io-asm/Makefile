doc:
	cargo doc --no-deps --document-private-items --open
build:
	wasm-pack build --out-dir build/bundler --target bundler --no-typescript
	\rm -f build/.gitignore
	wasm-pack build --out-dir build/nodejs --target nodejs --no-typescript
	\rm -f build/node/.gitignore