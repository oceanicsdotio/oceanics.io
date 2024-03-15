SRC = \
	$(shell find glsl -type f -name '*') \
	$(shell find app -type d) \
	$(shell find app -type f -name '*') \
	$(wildcard glsl/*) \

wasm: $(SRC)
	@ cargo install wasm-pack
	@ wasm-pack build app \
		--out-dir ../wasm \
		--out-name index

# Build the WASM library from Rust sources
# Local dependencies need to be built before we can install
# touching the directory updates timestamp for make
node_modules: wasm package.json $(SRC)
	@ yarn install
	@ touch -m $@
 
# Build the next site within Netlify to pick up env/config
build: next.config.mjs tsconfig.json netlify.toml node_modules
	@ yarn netlify init
	@ yarn netlify build

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