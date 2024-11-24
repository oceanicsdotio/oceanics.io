SRC = $(shell find app -type f -not -path 'app/lib/*' -not -path 'app/target/*')
FUNCTIONS = $(shell find functions/src -type f -name '*.mts')

# Build frontend WASM package
app/lib: $(shell find app -type f -name '*.rs') app/Cargo.lock app/Cargo.toml LICENSE
	@ cargo install wasm-pack
	@ cp LICENSE app/LICENSE
	@ wasm-pack build app \
		--out-dir lib \
		--out-name index
	@ touch -m $@

# Build backend WASM package
functions/lib: $(shell find functions -type f -name '*.rs') functions/Cargo.lock functions/Cargo.toml LICENSE
	@ cargo install wasm-pack
	@ cp LICENSE functions/LICENSE
	@ wasm-pack build functions \
		--out-dir lib \
		--target nodejs \
		--out-name index
	@ touch -m $@

# Build the WASM library from Rust sources
# Local dependencies need to be built before we can install
# touching the directory updates timestamp for make
node_modules: app/lib functions/lib package.json 
	@ yarn install
	@ touch -m $@
 
# Convert from YAML to JSON for bundling with API.
specification.json: specification.yaml node_modules
	@ yarn run js-yaml $< > $@

# Build OpenAPI docs page from specification.
public/openapi.html: specification.json
	@ yarn run redocly build-docs $< --output $@

examples.json: examples.ts specification.json
	@ yarn exec tsx examples.ts specification.json examples.json

# Build the next site within Netlify to pick up env/config.
out: $(SRC) next.config.ts tsconfig.json netlify.toml public/openapi.html examples.json 
	@ yarn run tsc
	@ yarn netlify init
	@ yarn netlify build
	@ touch -m $@

# Start up local development environment.
dev: out
	@ yarn netlify dev
.PHONY: dev

# Rust tests generate code coverage.
coverage:
	@ cargo llvm-cov --manifest-path functions/Cargo.toml --html --output-dir $@
	@ touch -m $@

# Create examples with static UUID values for deterministic testing.
test: out coverage
	@ yarn jest -t "functions"
.PHONY: test

# Deploy to production.
prod: out
	@ yarn netlify deploy --prod --message "Makefile Deploy" --open
.PHONY: prod

# Deploy to test environment.
deploy: out
	@ yarn netlify deploy --alias=test --message "Makefile Deploy" --open
.PHONY: deploy

# Remove build artifacts.
clean:
	@ rm -f examples.json
	@ rm -f specification.json
	@ rm -f public/openapi.html
	@ rm -rf functions/lib
	@ rm -rf functions/target
	@ rm -rf functions/LICENSE
	@ rm -rf app/lib
	@ rm -rf app/target
	@ rm -rf app/LICENSE
	@ rm -rf node_modules
	@ rm -rf .netlify
	@ rm -rf .next
	@ rm -rf coverage
.PHONY: clean

update-node:
	yarn upgrade-interactive
.PHONY: update-node

# Cleanup targets on error
.DELETE_ON_ERROR:
