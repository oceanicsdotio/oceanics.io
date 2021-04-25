/**
 * Yup, the whole SDK
 */
const { Endpoint, S3 } = require("aws-sdk");


/**
 * Some of our "server-side" WASM code. 
 */
const { VertexArrayBuffer } = require("./wasm/node/neritics");


/**
 * Polyfilled on Linux, I think? 
 */
const { readFileSync } = require('fs');


/**
 * Feeling yucky about these dependencies, but it's just the pre-process
 * step.
 */
const NetCDFReader = require('netcdfjs');


/**
 * Driver for secure object storage access
 */
const s3 = new S3({
    endpoint: new Endpoint("nyc3.digitaloceanspaces.com"),
    accessKeyId: process.env.SPACES_ACCESS_KEY,
    secretAccessKey: process.env.SPACES_SECRET_KEY
});

/**
 * Location of primary data
 */
 const ASSET = "GRCTellus.JPL.200204_202102.GLO.RL06M.MSCNv02CRI.nc";

/**
 * Set up pipe
 */
const data = readFileSync(`./bin/${ASSET}`);

/**
 * Set up the reader to read the header. Why does this need to be an object?
 */
const reader = new NetCDFReader(data);

/**
 * Just need variables, and version ("classic")
 */
const metadata = {
    variables: reader.variables,
    version: reader.version
};

const handleError = msg => err => {
    if (err) console.log("message" in err ? err.message : `error ${msg}`);
}

/**
 * Push header back to S3 as json
 */

s3.putObject({
    Bucket: `oceanicsdotio`,
    Body: JSON.stringify(metadata),
    ContentType: `application/json`,
    Key: `grace/header.json`,
}, handleError("in push-metadata"));

console.log("Pushed header data.\n");



(async () => {

    const ENCODER_RADIX = 36;  // Binary to ASCII conversion

    const [start, end] = [0, 720*360]

    console.log("Preparing VAB...");
    
    const vab = new VertexArrayBuffer(`grace`, `test`, start, end, ENCODER_RADIX);

    const { offset } = metadata.variables.filter(({name})=> name === `lwe_thickness`).pop();

    console.log("Preparing to fetch...");

    const source = (await s3.getObject({
        Bucket: `oceanicsdotio`,
        Range: `bytes=${offset + start}-${offset + end*4}`,
        Key: `grace/${ASSET}`,
    }).promise().catch(handleError("in get-subset")));

    console.log("Fetched data");


    // single precision raw bytes to write result to
    const buffer = {
        target: new ArrayBuffer((end-start+1)*4),
        source: source.Body.buffer,
    }

    // allows writing typed variables and swapping endianness
    const view = {
        target: new DataView(buffer.target),
        source: new DataView(buffer.source)
    }

    // 
    for (let ii = 0; ii < end - start; ii++) {
        const value = view.source.getFloat32(ii*4, false);
        view.target.setFloat32(ii*4, value, true);  // swap endianness
    }
    
    // Create single precision view of array buffer
    const data = new Float32Array(buffer.target);

    //
    s3.putObject({
        Body: Buffer.from(data.buffer),
        Bucket: `oceanicsdotio`,
        Key: vab.fragment(),
        ContentType: 'application/octet-stream',
        ACL:'public-read',
    }, handleError("in push-chunk"));

    console.log("Pushed new chunk");
    
    console.log({
        key: vab.fragment(),
        interval: vab.interval(),
        next: vab.next()
    });
    
})();


