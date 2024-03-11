SRC = $(shell find src -type d)
SRC_FILES = $(shell find src -type f -name '*')
PAGES = $(shell find pages -type d)
PAGES_FILES = $(shell find pages -type f -name '*')
RUST = $(shell find rust -type d)
RUST_FILES = $(shell find rust -type f -name '*')
WASM = lib
CACHE = public/nodes.json

$(WASM): $(RUST) $(RUST_FILES)
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
$(BUILD): $(CACHE) $(PAGES) $(PAGES_FILES) $(SRC) $(SRC_FILES) next.config.mjs tsconfig.json
	@ yarn run next build
	@ touch -m $@

netlify:
	@ yarn netlify init
	@ yarn netlify build

dev: build
	@ yarn netlify dev

deploy: build
	@ yarn netlify deploy --prod

# Remove build artifacts
clean:
	@ rm -rf $(WASM)
	@ rm -rf node_modules
	@ rm $(CACHE)
	@ rm -rf $(BUILD)
	

# Non-file targets (aka commands)
.PHONY: clean dev deploy netlify

# Cleanup targets on error
.DELETE_ON_ERROR: