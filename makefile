WASM = oceanics-io-wasm
WWW = oceanics-io-www
API = oceanics-io-api
SHARED = $(API)/src/shared
SPEC = bathysphere
SPEC_FILE = ./$(SPEC).yaml

# Install rust interactively on the system
rustup:
	curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install rust to WASM transpiler
wasm-pack:
	cargo install wasm-pack

api-clean: 
	yarn workspace $(API) run rimraf dist/

api-spec:
	yarn run js-yaml $(SPEC_FILE) > $(SHARED)/$(SPEC).json

api-wasm:
	wasm-pack build $(WASM) --out-dir ../$(SHARED)/pkg --target nodejs

api-copy:
	yarn workspace $(API) run copyfiles -u 1 src/shared/pkg/* src/**/*.txt src/**/*.json dist

api-compile:
	yarn workspace $(API) run tsc

api: api-clean api-spec api-wasm api-copy api-compile
	
.PHONY: api-clean api-spec api-copy api-compile api

www-wasm:
	rm -rf $(WASM)/build
	wasm-pack build $(WASM) --out-dir build --out-name index
	(rm $(WASM)/build/.gitignore || :)

www-docs:
	yarn run redoc-cli build $(SPEC_FILE) --output ./$(WWW)/public/$(SPEC).html

www-next:
	yarn workspace $(WWW) run next build

www-stories:
	yarn workspace $(WWW) run build-storybook --loglevel warn

www-export: 
	yarn workspace $(WWW) run next export -o build

www: www-wasm www-docs www-next www-export

.PHONY: www-wasm www-docs www-stories www-next www-export www

# start-storybook:
# 	yarn workspace $(WWW) run start-storybook -p 6006

# start-next:
# 	yarn workspace $(WWW) run next dev

start:
	netlify dev --dir=$(WWW)/build

test:
	yarn workspace $(API) run mocha
