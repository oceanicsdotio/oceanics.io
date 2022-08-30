## API targets

# Build WASM for NodeJS
API = oceanics-io-api
API_RUST = $(API)-rust
API_WASM = $(API)-wasm
API_OUT = $(API)/build
$(API_WASM): $(API_RUST)/src/* $(API_RUST)/Cargo*
	wasm-pack build $(API_RUST) \
		--out-dir ../$@ \
		--target nodejs \
		--out-name index
	touch -m $@

# Convert from YAML to JSON for bundling with API
SHARED = src/shared
SPEC_FILE = ./bathysphere.yaml
API_JSON = $(API)/$(SHARED)/bathysphere.json
$(API_JSON): $(SPEC_FILE) node_modules
	yarn run js-yaml $< > $@

# Compile API
$(API_OUT): node_modules $(API_JSON) $(API)/src/**/* $(API)/tsconfig.json
	yarn eslint "$(API)/src/**/*.{js,ts,json}"
	yarn workspace $(API) run tsc 
	touch -m $@

# PHONYs for convenience
.PHONY: api api-cleanup 
api: $(API_OUT)
api-cleanup:
	rm -rf $(API_WASM)
	rm -rf $(API_OUT)

## WWW targets

# Build WASM for web bunder (default --target)
WWW = oceanics-io-www
WWW_RUST = $(WWW)-rust
WWW_WASM = $(WWW)-wasm
WWW_OUT = $(WWW)/build
$(WWW_WASM): $(WWW_RUST)/src/**/* $(WWW_RUST)/Cargo*
	wasm-pack build $(WWW_RUST) \
		--out-dir ../$@ \
		--out-name index
	touch -m $@

# Build OpenAPI docs page from specification
DOCS_PAGE = $(WWW)/public/bathysphere.html
$(DOCS_PAGE): $(SPEC_FILE) node_modules
	yarn run redoc-cli build $< --output $@

# Build WWW storybook pages
STORYBOOK = public/dev/storybook
$(WWW)/$(STORYBOOK): $(WWW)/src/**/* $(WWW)/.storybook/*
	yarn workspace oceanics-io-www build-storybook --output-dir $(STORYBOOK)  --webpack-stats-json
	touch -m $@

# Compile WWW
$(WWW)/$(OUT_DIR): node_modules $(WWW)/**/*
	yarn eslint "$(WWW)/src/**/*.{js,ts,json,tsx,jsx}"
	yarn workspace $(WWW) run next build
	yarn workspace $(WWW) run next export -o $(OUT_DIR)
	touch -m $@

# PHONY for convenience
.PHONY: www www-cleanup
www: $(WWW)/$(OUT_DIR)
www-cleanup:
	rm -rf $(WWW_WASM)
	rm -rf $(WWW)/.next
	rm -rf $(WWW)/$(OUT_DIR)
	rm -rf $(WWW)/$(STORYBOOK)

NATIVE = oceanics-io-native
$(NATIVE)/web-build:
	yarn workspace $(NATIVE) expo --non-interactive build:web

expo:
	yarn workspace $(NATIVE) expo start


# Local dependencies need to be built before we can install
# touching the directory updates timestamp for make
node_modules: $(API_WASM) $(WWW_WASM) package.json **/package.json yarn.lock
	yarn install
	touch -m $@

# Build everything
.: api www

# Serve the storybook docs in dev mode for manual testing
start-storybook:
	yarn workspace oceanics-io-www start-storybook --port ${STORYBOOK_PORT}

# Create examples with static UUID values for deterministic testing
TEST_CACHE = nodes.json
$(TEST_CACHE): $(API_JSON)
	yarn exec node test-cache.js $< $@

# Test just Auth API to setup service account.
test-auth: $(TEST_CACHE)
	yarn workspace oceanics-io-api jest -t "auth handlers" --verbose

# This test set populates the test database, must be called after `test-auth`.
test-collection: $(TEST_CACHE)
	yarn workspace oceanics-io-api jest -t "collection handlers"

# Once database and cache are setup
test-idempotent: $(TEST_CACHE)
	yarn workspace oceanics-io-api jest -t "idempotent"

# Run jest incrementally, because order matters
test: $(TEST_CACHE) test-auth test-collection test-idempotent

# Run the dev server
dev: .
	yarn netlify dev

# Remove build artifacts
clean: api-cleanup www-cleanup
	rm -rf node_modules/

# Non-file targets (aka commands)
.PHONY: clean start-storybook test-auth test-collection test-idempotent test lock dev

# Cleanup targets on error
.DELETE_ON_ERROR: