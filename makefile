FUNCTIONS_DIR=oceanics-io-fcns/src/shared
WASM=oceanics-io-wasm
WWW=oceanics-io-www

    "develop": "next dev",
    "build:docs": "redoc-cli build ./public/bathysphere.yaml --output ./public/bathysphere.html",
    "build:next": "next build && next export -o build",
    "build": "yarn build:docs && yarn build:next",
    "start": "start-storybook -p 6006",
    "build-storybook": "build-storybook --loglevel warn",
    "tsc": "tsc",
    "postinstall": "tsc"

rust:
	curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
	cargo install wasm-pack
	
spec:
	js-yaml $(WWW)/public/bathysphere.yaml > $(FUNCTIONS_DIR)/bathysphere.json

wasm-node:
	wasm-pack build $(WASM) --out-dir ../$(FUNCTIONS_DIR)/pkg --target nodejs

build: spec wasm-node
	yarn workspaces foreach run build

run:
	netlify dev --dir=$(WWW)/build

wasm-pack:
	rm -rf $(WASM)/build
	wasm-pack build $(WASM) --out-dir build --out-name index
	(rm $(WASM)/build/.gitignore || :)

test:
	yarn test

.PHONY: spec wasm-node build run wasm-pack test