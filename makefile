WASM = oceanics-io-wasm
WWW = oceanics-io-www
API = oceanics-io-api
WASM_NODE = $(WASM)-node
WASM_WWW = $(WASM)-www
OUT_DIR = build
SHARED = $(API)/src/shared
SPEC = bathysphere
SPEC_FILE = ./$(SPEC).yaml
SPEC_JSON = $(SHARED)/$(SPEC).json

# Install rust interactively on the system
install-rustup:
	curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install rust to WASM transpiler
install-wasm-pack:
	cargo install wasm-pack

# Remove build artifacts
api-clean:
	(rm $(SPEC_JSON) || :)
	(rm -rf $(API)/dist/ || :)

# Convert from YAML to JSON for bundling OpenAPI
api-spec:
	yarn dlx js-yaml $(SPEC_FILE) > $(SPEC_JSON)

# Build WASM for NodeJS
oceanics-io-wasm-node: oceanics-io-wasm
	(rm -rf $(WASM_NODE) || :)
	wasm-pack build $(WASM) \
		--out-dir ../$(WASM_NODE) \
		--target nodejs \
		--out-name index
	sed -i ".bak" -e 's/"name": "$(WASM)"/"name": "$(WASM_NODE)"/g' $(WASM_NODE)/package.json
	rm $(WASM_NODE)/package.json.bak

# Build WASM for web
oceanics-io-wasm-www: oceanics-io-wasm
	(rm -rf $(WASM_WWW) || :)
	wasm-pack build $(WASM) \
		--out-dir ../$(WASM_WWW) \
		--out-name index

# Copy data and WASM package over to build
api-copy:
	yarn workspace $(API) dlx copyfiles -u 1 src/shared/pkg/* src/**/*.txt src/**/*.json dist

api-preinstall: api-clean api-spec api-wasm api-copy

# Transpile source code into deployable build
api-compile:
	yarn workspace $(API) run tsc

# Full API build process
api: api-preinstall api-compile
	
.PHONY: api-clean api-spec api-wasm api-copy api-precompile api-compile api

www-clean:
	(rm -rf $(WASM)/$(OUT_DIR) || :)



# Build OpenAPI docs page from specification
www-docs:
	yarn dlx redoc-cli build $(SPEC_FILE) --output ./$(WWW)/public/$(SPEC).html

www-preinstall: www-wasm www-docs

# Create production build of the site
www-next:
	yarn workspace $(WWW) run next build

# Export as static HTML
www-export: 
	yarn workspace $(WWW) run next export -o $(OUT_DIR)

www-compile: www-next www-export

# Full site build process
www: www-clean www-preinstall www-compile

.PHONY: www-clean www-wasm www-docs www-next www-export www-compile www

# Build everything
all: api www

# Start up emulation environment
run:
	yarn run netlify dev --dir=$(WWW)/$(OUT_DIR)

# Run tests against the emulation environment
test:
	yarn workspace $(API) run mocha

.PHONY: all run test