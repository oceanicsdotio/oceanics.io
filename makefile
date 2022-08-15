WASM = oceanics-io-wasm
WWW = oceanics-io-www
API = oceanics-io-api
WASM_NODE_SRC = $(WASM)-api
WASM_NODE = $(WASM_NODE_SRC)-node
WASM_WWW_SRC = $(WASM)-ui
WASM_WWW = $(WASM_WWW_SRC)-www
OUT_DIR = build
SPEC = bathysphere
SPEC_FILE = ./$(SPEC).yaml
DOCS_PAGE = $(WWW)/public/$(SPEC).html

# Build WASM for NodeJS
$(WASM_NODE): $(WASM_NODE_SRC)
	(rm -rf $(WASM_NODE) || :)
	wasm-pack build $(WASM_NODE_SRC) \
		--out-dir ../$(WASM_NODE) \
		--target nodejs \
		--out-name index
	sed -i 's/"name": "$(WASM_NODE_SRC)"/"name": "$(WASM_NODE)"/g' $(WASM_NODE)/package.json

# Build WASM for web
$(WASM_WWW): $(WASM_WWW_SRC)
	(rm -rf $(WASM_WWW) || :)
	wasm-pack build $(WASM_WWW_SRC) \
		--out-dir ../$(WASM_WWW) \
		--out-name index
	sed -i 's/"name": "$(WASM_WWW_SRC)"/"name": "$(WASM_WWW)"/g' $(WASM_WWW)/package.json

node_modules: $(WASM_NODE) $(WASM_WWW) package.json yarn.lock $(API)/package.json $(WWW)/package.json
	yarn install

# Build OpenAPI docs page from specification
$(DOCS_PAGE): $(SPEC_FILE) node_modules
	yarn run redoc-cli build $(SPEC_FILE) --output $(DOCS_PAGE)

# Convert from YAML to JSON for bundling OpenAPI
$(API)/shared: $(SPEC_FILE) node_modules
	yarn run js-yaml $(SPEC_FILE) > $(API)/src/shared/$(SPEC).json

# Compile API
$(API)/$(OUT_DIR): node_modules $(API)/shared $(API)/package.json
	(rm -rf $(API)/$(OUT_DIR)/ || :)
	yarn workspace $(API) run tsc

# Compile WWW
$(WWW)/$(OUT_DIR): node_modules $(DOCS_PAGE) $(WWW)/package.json
	yarn workspace $(WWW) run next build
	yarn workspace $(WWW) run next export -o $(OUT_DIR)

.: $(API)/$(OUT_DIR) $(WWW)/$(OUT_DIR)

clean:
	rm -rf $(WASM_NODE)
	rm -rf $(WASM_WWW)
	rm -rf node_modules/
	rm -rf $(WWW)/.next
	rm -rf $(WWW)/$(OUT_DIR)
	rm -rf $(WWW)/storybook-static
	rm -rf $(API)/$(OUT_DIR)

.PHONY: clean
