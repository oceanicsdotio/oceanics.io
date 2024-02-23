## WWW targets
WWW = oceanics-io-www
WWW_SRC = $(shell find $(WWW)/src -type d)
WWW_SRC_FILES = $(shell find $(WWW)/src -type f -name '*')
WWW_PAGES = $(shell find $(WWW)/pages -type d)
WWW_PAGES_FILES = $(shell find $(WWW)/pages -type f -name '*')
WWW_RUST = $(WWW)-rust
WWW_WASM = $(WWW)-wasm
WWW_OUT = $(WWW)/build
WWW_CACHE = $(WWW)/public/nodes.json
CACHE_SCRIPT = test-cache.js
STORYBOOK = public/dev/storybook
OUT_DIR = build

# Build WASM for web bunder (default --target)
$(WWW_WASM): $(WWW_RUST)/src/**/* $(WWW_RUST)/Cargo*
	wasm-pack build $(WWW_RUST) \
		--out-dir ../$@ \
		--out-name index
	touch -m $@

$(WWW_CACHE): $(API_JSON) $(CACHE_SCRIPT)
	yarn exec node $(CACHE_SCRIPT) $< $@

# Build WWW storybook pages
$(WWW)/$(STORYBOOK): $(WWW)/src/**/* $(WWW)/.storybook/*
	yarn workspace oceanics-io-www build-storybook --output-dir $(STORYBOOK)  --webpack-stats-json
	touch -m $@

lint: $(WWW_SRC) $(WWW_SRC_FILES) $(WWW_PAGES) $(WWW_PAGES_FILES)
	yarn eslint "$(WWW)/src/**/*.{js,ts,json,tsx,jsx}"
	yarn eslint "$(WWW)/pages/**/*.{tsx,jsx}"

# Compile WWW
$(WWW)/$(OUT_DIR): node_modules lint $(WWW_CACHE)
	yarn workspace $(WWW) run next build
	touch -m $@

.: $(WWW)/$(OUT_DIR)

dev: .
	yarn netlify dev --filter=oceanics-io-www

# Local dependencies need to be built before we can install
# touching the directory updates timestamp for make
node_modules: $(WWW_WASM) package.json **/package.json yarn.lock
	yarn install
	touch -m $@

# Serve the storybook docs in dev mode for manual testing
storybook:
	yarn workspace oceanics-io-www storybook dev \
		--port ${STORYBOOK_PORT} \
		--debug
		--debug-webpack

netlify: .
	yarn netlify init --filter oceanics-io-www
	yarn netlify build --filter oceanics-io-www

deploy: netlify
	yarn netlify deploy --prod --filter oceanics-io-www

# Remove build artifacts
clean:
	rm -rf $(WWW_WASM)
	rm -rf $(WWW)/.next
	rm -rf $(WWW)/$(OUT_DIR)
	rm -rf $(WWW)/$(STORYBOOK)
	rm -rf node_modules/

# Non-file targets (aka commands)
.PHONY: clean storybook dev lint deploy netlify

# Cleanup targets on error
.DELETE_ON_ERROR: