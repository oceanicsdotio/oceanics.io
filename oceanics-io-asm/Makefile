build:
	wasm-pack build --out-dir src/wasm --dev --target bundler --no-typescript
	rm src/wasm/.gitignore
    wasm-pack build --out-dir src/wasm/node --target nodejs --no-typescript
	rm src/wasm/node/.gitignore
