WASM = oceanics-io-wasm
WWW = oceanics-io-www
API = oceanics-io-api
WASM_NODE = $(WASM)-node
WASM_WWW = $(WASM)-www
OUT_DIR = build
DEPLOY = $(WWW)/$(OUT_DIR)
SHARED = $(API)/src/shared
SPEC = bathysphere
SPEC_FILE = ./$(SPEC).yaml
SPEC_JSON = $(SHARED)/$(SPEC).json
DOCS_PAGE = $(WWW)/public/$(SPEC).html

# Build WASM for NodeJS
$(WASM_NODE): $(WASM)
	(rm -rf $(WASM_NODE) || :)
	wasm-pack build $(WASM) \
		--out-dir ../$(WASM_NODE) \
		--target nodejs \
		--out-name index
	sed -i ".bak" -e 's/"name": "$(WASM)"/"name": "$(WASM_NODE)"/g' $(WASM_NODE)/package.json
	rm $(WASM_NODE)/package.json.bak

# Build WASM for web
$(WASM_WWW): $(WASM)
	(rm -rf $(WASM_WWW) || :)
	wasm-pack build $(WASM) \
		--out-dir ../$(WASM_WWW) \
		--out-name index
	sed -i ".bak" -e 's/"name": "$(WASM)"/"name": "$(WASM_WWW)"/g' $(WASM_WWW)/package.json
	rm $(WASM_WWW)/package.json.bak

# Convert from YAML to JSON for bundling OpenAPI
$(API)/shared: $(SPEC_FILE)
	yarn run js-yaml $(SPEC_FILE) > $(SPEC_JSON)

# Build OpenAPI docs page from specification
$(DOCS_PAGE): $(SPEC_FILE)
	yarn dlx redoc-cli build $(SPEC_FILE) --output $(DOCS_PAGE)

node_modules: $(WASM_NODE) $(WASM_WWW) package.json yarn.lock
	yarn install

# Compile API
$(API)/dist: node_modules $(API)/shared 
	(rm -rf $(API)/dist/ || :)
	yarn workspace $(API) run tsc

# Compile WWW
$(DEPLOY): node_modules $(DOCS_PAGE)
	yarn workspace $(WWW) run next build
	yarn workspace $(WWW) run next export -o $(OUT_DIR)

# Install rust interactively on the system
install-rustup:
	curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install rust to WASM transpiler
install-wasm-pack:
	cargo install wasm-pack

# Start up emulation environment
run: $(API)/dist $(DEPLOY)
	yarn run netlify dev --dir=$(DEPLOY)

# Run tests against the emulation environment
test:
	yarn workspace $(API) run mocha

clean:
	rm -rf $(WASM_NODE)
	rm -rf $(WASM_WWW)
	rm -rf node_modules/
	rm -rf $(WWW)/.next
	rm -rf $(WWW)/build
	rm -rf $(WWW)/storybook-static
	rm -rf $(API)/dist

.PHONY: run test clean install-rustup install-wasm-pack