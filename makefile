SRC = \
	$(shell find glsl -type d) \
	$(shell find glsl -type f -name '*') \
	$(shell find app -type d) \
	$(shell find app -type f -name '*') \
	$(shell find rust -type d) \
	$(shell find rust -type f -name '*')
	
# Build the WASM library from Rust sources
wasm: $(SRC)
	@ cargo install wasm-pack
	@ wasm-pack build rust \
		--out-dir ../$@ \
		--out-name index
	@ touch -m $@

# Local dependencies need to be built before we can install
# touching the directory updates timestamp for make
node_modules: wasm package.json $(SRC)
	@ yarn install
	@ touch -m $@

# Build the next site within Netlify to pick up env/config
build: node_modules next.config.mjs tsconfig.json netlify.toml $(SRC)
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
	@ rm -rf build
	@ rm -rf .netlify
	@ rm -rf .next
.PHONY: clean

# Cleanup targets on error
.DELETE_ON_ERROR: