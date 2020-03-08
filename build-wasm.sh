#!/bin/sh
wasm-pack build . --target web --out-dir public
rm public/.gitignore