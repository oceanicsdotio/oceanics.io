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
$(WWW)/$(OUT_DIR): node_modules www-lint $(WWW_CACHE)
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
clean: www-cleanup
	rm -rf node_modules/

# Non-file targets (aka commands)
.PHONY: clean storybook dev

# Cleanup targets on error
.DELETE_ON_ERROR: