## API targets

# Build WASM for NodeJS
API = oceanics-io-api
API_RUST = $(API)-rust
API_WASM = $(API)-wasm
API_OUT = $(API)/build
$(API_WASM): $(API_RUST)/src/* $(API_RUST)/src/**/* $(API_RUST)/src/**/**/* $(API_RUST)/Cargo*
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

# Create examples with static UUID values for deterministic testing
TEST_CACHE = $(API)/test/nodes.json
CACHE_SCRIPT = test-cache.js
$(TEST_CACHE): $(API_JSON) $(CACHE_SCRIPT)
	yarn exec node $(CACHE_SCRIPT) $< $@

# Compile API
api: node_modules $(API_JSON) $(API)/src/**/* $(API)/src/* $(API)/tsconfig.json $(TEST_CACHE)
	yarn eslint "$(API)/src/**/*.{js,ts}"
	yarn workspace $(API) run tsc 

# Non-file targets
.PHONY: api-cleanup api-test-auth api-test-collection api-test-idempotent api-dev api-test api-test-middleware api-test-rust

api-test-rust:
	cargo test --manifest-path oceanics-io-api-rust/Cargo.toml

# Test just the WASM middleware
api-test-middleware: $(API_WASM)
	yarn workspace oceanics-io-api jest -t "wasm" --verbose

# Test just Auth API to setup service account.
api-test-auth: $(TEST_CACHE)
	yarn workspace oceanics-io-api jest -t "auth handlers" --verbose

# This test set populates the test database, must be called after `test-auth`.
api-test-collection: $(TEST_CACHE)
	yarn workspace oceanics-io-api jest -t "collection handlers"

# Once database and cache are setup
api-test-idempotent: $(TEST_CACHE)
	yarn workspace oceanics-io-api jest -t "idempotent"

api-test-content: $(TEST_CACHE)
	yarn workspace oceanics-io-api jest -t "creates Memos a-small-place"

# Serve functions locally
api-dev: api
	yarn netlify dev --filter oceanics-io-api --no-open

# Run jest incrementally, because order matters
api-test: $(TEST_CACHE) api-test-middleware api-test-auth api-test-collection api-test-idempotent api-test-content

api-cleanup:
	rm -rf $(API_WASM)
	rm -f $(TEST_CACHE)

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

WWW_CACHE = $(WWW)/public/nodes.json
$(WWW_CACHE): $(TEST_CACHE)
	cp $< $@

WWW_API_JSON = $(WWW)/public/bathysphere.json
$(WWW_API_JSON): $(API_JSON)
	cp $< $@

# Build OpenAPI docs page from specification
DOCS_PAGE = $(WWW)/public/bathysphere.html
$(DOCS_PAGE): $(SPEC_FILE) node_modules
	yarn run redocly build-docs $< --output $@

# Build WWW storybook pages
STORYBOOK = public/dev/storybook
$(WWW)/$(STORYBOOK): $(WWW)/src/**/* $(WWW)/.storybook/*
	yarn workspace oceanics-io-www build-storybook --output-dir $(STORYBOOK)  --webpack-stats-json
	touch -m $@

# Lint WWW
WWW_SRC = $(shell find $(WWW)/src -type d)
WWW_SRC_FILES = $(shell find $(WWW)/src -type f -name '*')
WWW_PAGES = $(shell find $(WWW)/pages -type d)
WWW_PAGES_FILES = $(shell find $(WWW)/pages -type f -name '*')
www-lint: $(WWW_SRC) $(WWW_SRC_FILES) $(WWW_PAGES) $(WWW_PAGES_FILES)
	yarn eslint "$(WWW)/src/**/*.{js,ts,json,tsx,jsx}"
	yarn eslint "$(WWW)/pages/**/*.{tsx,jsx}"

# Compile WWW
OUT_DIR = build
$(WWW)/$(OUT_DIR): node_modules www-lint $(WWW_CACHE) $(WWW_API_JSON) $(DOCS_PAGE)
	yarn workspace $(WWW) run next build
	touch -m $@

# command aliases for www
.PHONY: www www-cleanup www-dev www-lint
www: $(WWW)/$(OUT_DIR)
www-dev: $(WWW)/$(OUT_DIR)
	yarn netlify dev --filter=oceanics-io-www
www-cleanup:
	rm -rf $(WWW_WASM)
	rm -rf $(WWW)/.next
	rm -rf $(WWW)/$(OUT_DIR)
	rm -rf $(WWW)/$(STORYBOOK)

# Local dependencies need to be built before we can install
# touching the directory updates timestamp for make
node_modules: $(API_WASM) $(WWW_WASM) package.json **/package.json yarn.lock
	yarn install
	touch -m $@

# Build everything
.: www

# Serve the storybook docs in dev mode for manual testing
storybook:
	yarn workspace oceanics-io-www storybook dev \
		--port ${STORYBOOK_PORT} \
		--debug
		--debug-webpack

lint:
	yarn eslint "**/*.{js,ts,json,tsx,jsx}"

netlify: .
	yarn netlify init --filter oceanics-io-www
	yarn netlify build --filter oceanics-io-www

deploy: netlify
	yarn netlify deploy --prod --filter oceanics-io-www

# Remove build artifacts
clean: api-cleanup www-cleanup
	rm -rf node_modules/

# Non-file targets (aka commands)
.PHONY: clean storybook dev

# Cleanup targets on error
.DELETE_ON_ERROR: