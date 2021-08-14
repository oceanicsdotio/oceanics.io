/**
 * Dynamically create webpack behaviors based on what stage
 * being executed. 
 * 
 * During HTML stage, need to avoid loading client-side code. This includes
 * MapBox, any WASM, and web workers. 
 * 
 * When develop/build is called, we re-compile all the rust code to create
 * the JS module bindings into Rust-WASM. This prevents bad code from being
 * deployed.
 * 
 * @param {*} param0 
 */
exports.onCreateWebpackConfig = ({ stage, loaders, actions }) => {
    if (stage === 'build-html') {
        actions.setWebpackConfig({
            module: {
                rules: [
                    {
                        test: /mapbox-gl/,
                        use: loaders.null(),
                    },
                    {
                        test: /\.worker\.js$/,
                        use: { loader: 'workerize-loader' }
                    }
                ]
            }
        })
    }
}
