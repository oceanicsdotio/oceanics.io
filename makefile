WWW = oceanics-io-www
API = oceanics-io-api

OUT_DIR = build
SPEC = bathysphere
SPEC_FILE = ./$(SPEC).yaml
DOCS_PAGE = $(WWW)/public/$(SPEC).html
STORYBOOK = public/dev/storybook

# Build WASM for NodeJS
$(API)-wasm: $(wildcard $(API)-rust/src/**/*) $(wildcard $(API)-rust/Cargo*)
	(rm -rf $(API)-wasm || :)
	wasm-pack build $(API)-rust \
		--out-dir ../$(API)-wasm \
		--target nodejs \
		--out-name index
	sed -i 's/"name": "$(API)-rust"/"name": "$(API)-wasm"/g' $(API)-wasm/package.json

# Build WASM for web
$(WWW)-wasm: $(wildcard $(WWW)-rust/src/**/*) $(wildcard $(WWW)-rust/Cargo*)
	(rm -rf $(WWW)-wasm || :)
	wasm-pack build $(WWW)-rust \
		--out-dir ../$(WWW)-wasm \
		--out-name index
	sed -i 's/"name": "$(WWW)-rust"/"name": "$(WWW)-wasm"/g' $(WWW)-wasm/package.json

node_modules: $(API)-wasm $(WWW)-wasm yarn.lock $(wildcard **/package.json)
	yarn install

# Build OpenAPI docs page from specification
$(DOCS_PAGE): $(SPEC_FILE) node_modules
	yarn run redoc-cli build $(SPEC_FILE) --output $(DOCS_PAGE)

# Build static storybook pages
$(WWW)/$(STORYBOOK): $(wildcard $(WWW)/src/**/*)
	yarn workspace oceanics-io-www build-storybook --output-dir $(STORYBOOK)  --webpack-stats-json

# Convert from YAML to JSON for bundling OpenAPI
$(API)/shared: $(SPEC_FILE) node_modules
	yarn run js-yaml $(SPEC_FILE) > $(API)/src/shared/$(SPEC).json

# Compile API
$(API)/$(OUT_DIR): node_modules $(API)/shared $(API)/package.json
	(rm -rf $(API)/$(OUT_DIR)/ || :)
	yarn workspace $(API) run tsc

# Compile WWW
$(WWW)/$(OUT_DIR): node_modules $(DOCS_PAGE) $(WWW)/package.json $(WWW)/$(STORYBOOK)
	yarn workspace $(WWW) run next build
	yarn workspace $(WWW) run next export -o $(OUT_DIR)

.: $(API)/$(OUT_DIR) $(WWW)/$(OUT_DIR)

clean:
	rm -rf $(API)-wasm
	rm -rf $(WWW)-wasm
	rm -rf node_modules/
	rm -rf $(WWW)/.next
	rm -rf $(WWW)/$(OUT_DIR)
	rm -rf $(WWW)/$(STORYBOOK)
	rm -rf $(API)/$(OUT_DIR)

.PHONY: clean
