SRC = \
	$(shell find app -type d) \
	$(shell find app -type f -name '*')

wasm: $(SRC)
	@ cargo install wasm-pack
	@ wasm-pack build app \
		--out-dir ../wasm \
		--out-name index
	@ touch -m $@

# Build the WASM library from Rust sources
# Local dependencies need to be built before we can install
# touching the directory updates timestamp for make
node_modules: wasm package.json $(SRC)
	@ yarn install
	@ touch -m $@
 
# Build the next site within Netlify to pick up env/config
out: next.config.mjs tsconfig.json netlify.toml node_modules
	@ yarn netlify init
	@ yarn netlify build
	@ touch -m $@

# Build the next site, called by Netlify build
next:
	@ yarn run next build
.PHONY: next

# Start up local development environment
dev: out
	@ yarn netlify dev
.PHONY: dev

# Deploy to production
deploy: out
	@ yarn netlify deploy --prod
.PHONY: prod

# Remove build artifacts
clean:
	@ rm -rf wasm
	@ rm -rf node_modules
	@ rm -rf out
	@ rm -rf .netlify
	@ rm -rf .next
.PHONY: clean

# Cleanup targets on error
.DELETE_ON_ERROR:

## API targets
SRC = functions
SPEC_YAML = specification.yaml
SPEC_JSON = specification.json
SPEC_HTML = public/index.html
WASM = functions/lib
CACHE = functions/test/cache.json
LINT = functions/test/lint.log

$(WASM): $(wildcard rust/*)
	@ cargo install wasm-pack
	@ wasm-pack build rust \
		--out-dir ../$@ \
		--target nodejs \
		--out-name index
	@ touch -m $@

# Local dependencies need to be built before we can install
# touching the directory updates timestamp for make
node_modules: package.json $(WASM)
	@ yarn install
	@ touch -m $@

# Convert from YAML to JSON for bundling with API
$(SPEC_JSON): $(SPEC_YAML) node_modules
	@ yarn run js-yaml $< > $@
	@ yarn run js-yaml $< > public/openapi.json

# Build OpenAPI docs page from specification
$(SPEC_HTML): $(SPEC_JSON) node_modules
	@ yarn run redocly build-docs $< --output $@

# Generate lint report
$(LINT): $(wildcard $(SRC)/*) .eslintrc.json
	@ yarn eslint -o $@

# Run in github Actions
ci: $(SPEC_JSON) $(LINT) $(WASM) tsconfig.json
	@ yarn run tsc

# Dry-run build, no transpilation needed for functions
.: $(SPEC_JSON) $(SPEC_HTML) $(LINT) $(WASM) tsconfig.json 
	@ yarn run tsc 

# Create examples with static UUID values for deterministic testing
$(CACHE): cache.ts $(SPEC_JSON) 
	@ yarn exec tsx $^ $@

coverage: $(wildcard rust/*)
	@ cargo llvm-cov --manifest-path rust/Cargo.toml --html --output-dir $@
	@ touch -m $@

# Run all idempotent tests, generate a coverage report with istanbul/babel
test: $(CACHE) coverage
	@ yarn jest

# Remove build artifacts
clean:
	rm $(SPEC_JSON) $(SPEC_HTML) $(CACHE) $(LINT)
	rm -rf $(WASM)
	rm -rf $(COVERAGE)
	rm -rf node_modules

# Non-file targets (aka commands)
.PHONY: dev setup test clean ci

# Cleanup targets on error
.DELETE_ON_ERROR:
