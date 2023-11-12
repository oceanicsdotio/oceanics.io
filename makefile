WWW = oceanics-io-www
API = oceanics-io-api
OUT_DIR = build
SPEC = bathysphere
CACHE = nodes
SPEC_FILE = ./$(SPEC).yaml
DOCS_PAGE = $(WWW)/public/$(SPEC).html
STORYBOOK = public/dev/storybook
SHARED = src/shared

# Build WASM for NodeJS
API_WASM_SOURCE = $(wildcard $(API)-rust/src/**/*)
$(API)-wasm: $(API_WASM_SOURCE) $(wildcard $(API)-rust/Cargo*)
	(rm -rf $(API)-wasm || :)
	wasm-pack build $(API)-rust \
		--out-dir ../$(API)-wasm \
		--target nodejs \
		--out-name index
	sed -i 's/"name": "$(API)-rust"/"name": "$(API)-wasm"/g' $(API)-wasm/package.json

# Build WASM for web
$(WWW)-wasm: $(wildcard $(WWW)-rust/src/**/*) $(wildcard $(WWW)-rust/Cargo*)
	(rm -rf $(WWW)-wasm || :)
	wasm-pack build $(WWW)-rust \
		--out-dir ../$(WWW)-wasm \
		--out-name index
	sed -i 's/"name": "$(WWW)-rust"/"name": "$(WWW)-wasm"/g' $(WWW)-wasm/package.json

# Local dependencies need to be built before we can install
node_modules: $(API)-wasm $(WWW)-wasm yarn.lock $(wildcard **/package.json) package.json
	yarn install

# Build OpenAPI docs page from specification
$(DOCS_PAGE): $(SPEC_FILE) node_modules
	yarn run redocly build-docs $(SPEC_FILE) --output $(DOCS_PAGE)

# Build static storybook pages
STORY_SRC := $(wildcard $(WWW)/src/**/*) $(wildcard $(WWW)/.storybook/*)
$(WWW)/$(STORYBOOK): $(STORY_SRC)
	yarn workspace oceanics-io-www build-storybook --output-dir $(STORYBOOK)  --webpack-stats-json

# Convert from YAML to JSON for bundling OpenAPI
API_JSON_RELATIVE = $(SHARED)/$(SPEC).json
API_JSON = $(API)/$(API_JSON_RELATIVE)
$(API_JSON): $(SPEC_FILE) node_modules
	yarn run js-yaml $(SPEC_FILE) > $(API_JSON)

# Create examples with static UUID values for deterministic testing
TEST_CACHE_RELATIVE = $(SHARED)/$(CACHE).json
TEST_CACHE = $(API)/${TEST_CACHE_RELATIVE}
$(TEST_CACHE): $(API_JSON)
	yarn workspace $(API) exec node test-cache.js ./$(API_JSON_RELATIVE) ./$(TEST_CACHE_RELATIVE)

# Compile API
$(API)/$(OUT_DIR): node_modules $(API_JSON) $(wildcard $(API)/src/**/*) $(API)-wasm
	(rm -rf $(API)/$(OUT_DIR)/ || :)
	yarn workspace $(API) run tsc

# Compile WWW
$(WWW)/$(OUT_DIR): node_modules $(wildcard $(WWW)/**/*)
	yarn workspace $(WWW) run next build
	yarn workspace $(WWW) run next export -o $(OUT_DIR)

oceanics-io-native/web-build:
	yarn workspace oceanics-io-native expo --non-interactive build:web

expo:
	yarn workspace oceanics-io-native expo start

# Build everything
.: $(API)/$(OUT_DIR) $(WWW)/$(OUT_DIR) $(FILTERED_SRC) $(API_WASM_SOURCE)

# Serve the storybook docs in dev mode for manual testing
start-storybook:
	yarn workspace oceanics-io-www start-storybook --port ${STORYBOOK_PORT}

# Test just Auth API to setup service account.
test-auth:
	yarn workspace oceanics-io-api jest -t "auth handlers" --verbose

# This test set populates the test database, must be called after `test-auth`.
test-collection: $(TEST_CACHE)
	yarn workspace oceanics-io-api jest -t "collection handlers"

# Once database and cache are setup
test-idempotent: $(TEST_CACHE)
	yarn workspace oceanics-io-api jest -t "idempotent"

# Run jest incrementally, because order matters
test: $(TEST_CACHE) test-auth test-collection test-idempotent

# Run the dev server for only API
dev: .
	yarn netlify dev --no-open --filter=oceanics-io-api

lint:
	yarn eslint "**/*.{js,ts,json,tsx,jsx}"
	
# Remove build artifacts
clean:
	rm -rf $(API)-wasm
	rm -rf $(WWW)-wasm
	rm -rf node_modules/
	rm -rf $(WWW)/.next
	rm -rf $(WWW)/$(OUT_DIR)
	rm -rf $(WWW)/$(STORYBOOK)
	rm -rf $(API)/$(OUT_DIR)

# Non-file targets (aka commands)
.PHONY: clean start-storybook test-auth test-collection test-idempotent test lock dev
