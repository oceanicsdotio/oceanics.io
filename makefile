SRC = $(shell find src -type d)
SRC_FILES = $(shell find src -type f -name '*')
PAGES = $(shell find pages -type d)
PAGES_FILES = $(shell find pages -type f -name '*')
RUST = $(shell find rust -type f -name '*')

WASM = lib
CACHE = public/nodes.json
STORYBOOK = public/storybook
BUILD = build

$(WASM): $(RUST)
	@ cargo install wasm-pack
	@ wasm-pack build rust \
		--out-dir ../$@ \
		--out-name index
	@ touch -m $@

# Local dependencies need to be built before we can install
# touching the directory updates timestamp for make
node_modules: $(WASM) package.json
	@ yarn install
	@ touch -m $@

$(CACHE): cache.ts node_modules
	@ yarn exec tsx $< $@

# Compile WWW
$(BUILD): node_modules $(CACHE) next.config.mjs
	@ yarn run next build
	@ touch -m $@

.: $(BUILD)

dev: .
	yarn netlify dev

# Remove build artifacts
clean:
	rm -rf $(WASM)
	rm -rf .next
	rm -rf $(BUILD)
	rm -rf node_modules/

# Non-file targets (aka commands)
.PHONY: clean dev

# Cleanup targets on error
.DELETE_ON_ERROR: