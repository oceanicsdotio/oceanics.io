## WWW targets
SRC = $(shell find src -type d)
SRC_FILES = $(shell find src -type f -name '*')
PAGES = $(shell find pages -type d)
PAGES_FILES = $(shell find pages -type f -name '*')
RUST = $(shell find rust -type f -name '*')

WASM = lib
WWW_OUT = $(WWW)/build
WWW_CACHE = $(WWW)/public/nodes.json
CACHE_SCRIPT = cache.js
STORYBOOK = public/dev/storybook
OUT_DIR = build

$(WASM): $(RUST)
	@ wasm-pack build rust \
		--out-dir ../$@ \
		--out-name index
	@ touch -m $@

$(CACHE): cache.ts
	@ yarn exec tsx $^ $@

# Build WWW storybook pages
$(STORYBOOK): $(SRC_FILES) $(wildcard /.storybook/*)
	yarn build-storybook --output-dir $(STORYBOOK)  --webpack-stats-json
	touch -m $@

lint: $(WWW_SRC) $(WWW_SRC_FILES) $(WWW_PAGES) $(WWW_PAGES_FILES)
	yarn eslint "$(WWW)/src/**/*.{js,ts,json,tsx,jsx}"
	yarn eslint "$(WWW)/pages/**/*.{tsx,jsx}"

# Compile WWW
$(WWW)/$(OUT_DIR): node_modules lint $(WWW_CACHE)
	yarn run next build
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
	yarn storybook dev \
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