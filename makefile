SRC = \
	$(shell find app -type d) \
	$(shell find app -type f -name '*')

app/lib: $(shell find app -type f -name '*.rs')
	@ cargo install wasm-pack
	@ wasm-pack build app \
		--out-dir lib \
		--out-name index
	@ touch -m $@

functions/lib: $(shell find functions -type f -name '*.rs')
	@ cargo install wasm-pack
	@ wasm-pack build functions \
		--out-dir lib \
		--target nodejs \
		--out-name index
	@ touch -m $@

coverage: $(shell find functions -type f -name '*.rs')
	@ cargo llvm-cov --manifest-path rust/Cargo.toml --html --output-dir $@
	@ touch -m $@

# Build the WASM library from Rust sources
# Local dependencies need to be built before we can install
# touching the directory updates timestamp for make
node_modules: app/lib functions/lib package.json 
	@ yarn install
	@ touch -m $@
 
# Convert from YAML to JSON for bundling with API
specification.json: specification.yaml node_modules
	@ yarn run js-yaml $< > $@
	@ yarn run js-yaml $< > public/openapi.json

# Build OpenAPI docs page from specification
public/index.html: specification.json node_modules
	@ yarn run redocly build-docs $< --output $@

# Build the next site within Netlify to pick up env/config
out: next.config.mjs tsconfig.json netlify.toml node_modules public/index.html tsconfig.json
	@ yarn run tsc
	@ yarn netlify init
	@ yarn netlify build
	@ touch -m $@

# Create examples with static UUID values for deterministic testing
functions/test/cache.json: cache.ts specification.json 
	@ yarn exec tsx $^ $@

# Build the next site, called by Netlify build
next:
	@ yarn run next build
.PHONY: next

# Start up local development environment
dev: out
	@ yarn netlify dev
.PHONY: dev

# Run all idempotent tests, generate a coverage report with istanbul/babel
test: functions/test/cache.json coverage
	@ yarn jest
.PHONY: test

# Run in github Actions
ci: specification.json public/index.html 
	@ yarn run tsc
.PHONY: ci

# Deploy to production
deploy: out
	@ yarn netlify deploy --prod
.PHONY: prod

# Remove build artifacts
clean:
	@ rm -f functions/test/cache.json
	@ rm -rf functions/lib
	@ rm -rf node_modules
	@ rm -rf out
	@ rm -rf .netlify
	@ rm -rf .next
	@ rm -rf app/lib
	@ rm -rf coverage
.PHONY: clean

# Cleanup targets on error
.DELETE_ON_ERROR:
