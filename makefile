SRC = \
	$(shell find app -type d) \
	$(shell find app -type f -name '*')

app/lib: $(shell find app -type f -name '*.rs') app/Cargo.lock app/Cargo.toml
	@ cargo install wasm-pack
	@ wasm-pack build app \
		--out-dir lib \
		--out-name index
	@ touch -m $@

functions/lib: $(shell find functions -type f -name '*.rs') functions/Cargo.lock functions/Cargo.toml
	@ cargo install wasm-pack
	@ wasm-pack build functions \
		--out-dir lib \
		--target nodejs \
		--out-name index
	@ touch -m $@

# coverage: $(shell find functions -type f -name '*.rs')
# 	@ cargo llvm-cov --manifest-path rust/Cargo.toml --html --output-dir $@
# 	@ touch -m $@

# Build the WASM library from Rust sources
# Local dependencies need to be built before we can install
# touching the directory updates timestamp for make
node_modules: app/lib functions/lib package.json 
	@ yarn install
	@ touch -m $@
 
# Convert from YAML to JSON for bundling with API
specification.json: specification.yaml node_modules
	@ yarn run js-yaml $< > $@

# Build OpenAPI docs page from specification
public/openapi.html: specification.json
	@ yarn run redocly build-docs $< --output $@

examples.json: examples.ts specification.json
	@ yarn exec tsx examples.ts specification.json examples.json

# Build the next site within Netlify to pick up env/config
out: next.config.mjs tsconfig.json netlify.toml public/openapi.html tsconfig.json examples.json $(SRC)
	@ yarn run tsc
	@ yarn netlify init
	@ yarn netlify build
	@ touch -m $@

# Build the next site, called by Netlify build
next:
	@ yarn run next build
.PHONY: next

# Start up local development environment
dev: out
	@ yarn netlify init
	@ yarn netlify dev
.PHONY: dev

# Create examples with static UUID values for deterministic testing
test: out
	@ yarn jest
.PHONY: test

# Deploy to production
deploy: out
	@ yarn netlify deploy --prod --message "Makefile Deploy" --open
.PHONY: deploy

# Remove build artifacts
clean:
	@ rm -f examples.json
	@ rm -rf functions/lib
	@ rm -rf app/lib
	@ rm -rf node_modules
	@ rm -rf out
	@ rm -rf .netlify
	@ rm -rf .next
.PHONY: clean

# Cleanup targets on error
.DELETE_ON_ERROR:
