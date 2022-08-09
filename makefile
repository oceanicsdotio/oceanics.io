WASM = oceanics-io-wasm
WWW = oceanics-io-www
API = oceanics-io-api
OUT_DIR = build
SHARED = $(API)/src/shared
SPEC = bathysphere
SPEC_FILE = ./$(SPEC).yaml

# Install rust interactively on the system
install-rustup:
	curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install rust to WASM transpiler
install-wasm-pack:
	cargo install wasm-pack

# Remove build artifacts
api-clean: 
	rm -rf $(API)/dist/

# Convert from YAML to JSON for bundling OpenAPI
api-spec:
	yarn dlx js-yaml $(SPEC_FILE) > $(SHARED)/$(SPEC).json

# Build WASM for NodeJS target
api-wasm:
	wasm-pack build $(WASM) --out-dir ../$(SHARED)/pkg --target nodejs

# Copy data and WASM package over to build
api-copy:
	yarn workspace $(API) dlx copyfiles -u 1 src/shared/pkg/* src/**/*.txt src/**/*.json dist

api-precompile: api-clean api-spec api-wasm api-copy

# Transpile source code into deployable build
api-compile:
	yarn workspace $(API) run tsc

# Full API build process
api: api-precompile api-compile
	
.PHONY: api-clean api-spec api-wasm api-copy api-precompile api-compile api

www-clean:
	rm -rf $(WASM)/$(OUT_DIR)

# Compile WASM for web bundler
www-wasm:
	wasm-pack build $(WASM) --out-dir $(OUT_DIR) --out-name index
	(rm $(WASM)/$(OUT_DIR)/.gitignore || :)

# Build OpenAPI docs page from specification
www-docs:
	yarn dlx redoc-cli build $(SPEC_FILE) --output ./$(WWW)/public/$(SPEC).html

# Create production build of the site
www-next:
	yarn workspace $(WWW) run next build

# Export as static HTML
www-export: 
	yarn workspace $(WWW) run next export -o $(OUT_DIR)

# Full site build process
www: www-clean www-wasm www-docs www-next www-export

.PHONY: www-clean www-wasm www-docs www-next www-export www

# Build everything
all: api www

# Start up emulation environment
run:
	yarn run netlify dev --dir=$(WWW)/$(OUT_DIR)

# Run tests against the emulation environment
test:
	yarn workspace $(API) run mocha

.PHONY: all run test