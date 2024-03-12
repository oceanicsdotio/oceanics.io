SRC = \
	$(shell find src -type d) \
	$(shell find src -type f -name '*') \
	$(shell find pages -type d) \
	$(shell find pages -type f -name '*')
RUST = \
	$(shell find rust -type d) \
	$(shell find rust -type f -name '*')
	
# Build the WASM library from Rust sources
wasm: $(RUST)
	@ cargo install wasm-pack
	@ wasm-pack build rust \
		--out-dir ../$@ \
		--out-name index
	@ touch -m $@

# Local dependencies need to be built before we can install
# touching the directory updates timestamp for make
node_modules: wasm package.json
	@ yarn install
	@ touch -m $@

# Pre-process icon and graphics data for landing page animations
public/nodes.json: cache.ts node_modules
	@ yarn exec tsx $< $@

# Build the next site within Netlify to pick up env/config
build: public/nodes.json next.config.mjs tsconfig.json netlify.toml $(SRC)
	@ yarn netlify init
	@ yarn netlify build
	@ touch -m $@

# Build the next site, called by Netlify build
next:
	@ yarn run next build
.PHONY: next

# Start up local development environment
dev: build
	@ yarn netlify dev
.PHONY: dev

# Deploy to production
deploy: build
	@ yarn netlify deploy --prod
.PHONY: prod

# Remove build artifacts
clean:
	@ rm -rf wasm
	@ rm -rf node_modules
	@ rm public/nodes.json
	@ rm -rf build
	@ rm -rf .netlify
	@ rm -rf .next
.PHONY: clean

# Cleanup targets on error
.DELETE_ON_ERROR: