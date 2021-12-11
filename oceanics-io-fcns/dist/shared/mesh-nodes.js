"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = void 0;
const { Endpoint, S3 } = require("aws-sdk");
const { createHash } = require("crypto");
const { VertexArrayBuffer, IndexInterval } = require("./pkg/neritics");
const NetCDFReader = require('netcdfjs');
const { readFileSync } = require('fs');
const MAX_FRAGMENTS = null; // practical limitation for testing
const prefix = "MidcoastMaineMesh";
const sources = [{
        key: "midcoast_nodes",
        extension: "csv",
    },
    {
        key: "necofs_gom3_mesh",
        extension: "nc",
    }];
const endpoint = 'nyc3.digitaloceanspaces.com';
const Bucket = "oceanicsdotio";
const s3 = new S3({
    endpoint: new Endpoint(endpoint),
    accessKeyId: process.env.SPACES_ACCESS_KEY,
    secretAccessKey: process.env.SPACES_SECRET_KEY
});
const WEBGL_VERTEX_ARRAY_LIMIT = 65536;
const ENCODER_RADIX = 36;
const MAX_SLICE_SIZE = WEBGL_VERTEX_ARRAY_LIMIT / 8;
const textData = async (Key) => (await s3.getObject({ Bucket, Key }).promise()).Body.toString('utf-8');
const fromCsvString = (start, end, csvString) => {
    const lines = csvString.split("\r\n");
    const total = lines.length;
    if (start > total || start < 0 || end < 0)
        throw Error(`Index (${start},${end}) out of range (0,${total})`);
    const stop = Math.min(end, total);
    // Lazy load lines if necessary
    return new Float32Array(lines
        .slice(start, stop)
        .reduce((acc, line, ii) => {
        if (ii && !(ii % 2 ** 12))
            console.log(`Processing line ${ii}/${stop - start}...`);
        return acc.concat(line.split(",")
            .slice(1, 4)
            .map(x => parseFloat(x.trim())));
    }, []));
};
/**
 * Make slices of the Vertex Array Buffer for the points that form the
 * spatial dimensions of the graph.
 *
 * The function limits the length of the buffer and precision of the points.
 * The result is appropriate for visualization in web applications.
 */
const VertexArrayBufferSlice = async ({ prefix, key, extension, start, end, delta, update = false, source = null, radix = ENCODER_RADIX, returnSource = false, }) => {
    const vab = new VertexArrayBuffer(prefix, key, start, end, radix);
    let lines = null;
    // Check for existing fragment
    const metadata = await s3.headObject({
        Bucket,
        Key: vab.fragment()
    }).promise().catch((err) => {
        if (err.code === "NotFound")
            return null;
        else
            throw err;
    });
    if (!metadata || update) {
        let data = null;
        if (extension === "csv") {
            lines = source || (await textData(`${prefix}/${key}.${extension}`)).split("\r\n"); // Lazy load lines if necessary    
            data = fromCsvString(start, end, lines);
        }
        else if (extension === "nc") {
            const { variables } = JSON.parse(await textData(`${prefix}/${key}/variables.json`));
            const width = 4;
            const keys = { "lon": 0, "lat": 1, "h": 2 };
            const vars = variables.filter(({ name }) => name in keys);
            const arrayBuffer = new ArrayBuffer((delta) * 3 * width);
            const dv = new DataView(arrayBuffer);
            for (const k in vars) {
                const { offset, size, name } = vars[k];
                const range = [
                    offset + start * width,
                    offset + end * width * 4
                ];
                const view = new DataView((await s3.getObject({
                    Bucket,
                    Key: `${prefix}/${key}.${extension}`,
                    Range: `bytes=${range[0]}-${range[1]}`
                }).promise()).Body.buffer);
                for (let ii = 0; ii < (delta - 1); ii++) {
                    const index = (ii * 3 + keys[name]) * width;
                    try {
                        const value = view.getFloat32(ii * width, false);
                        dv.setFloat32(index, value, true); // swap endiannesskeys
                    }
                    catch (err) {
                        console.log({
                            length: view.buffer.byteLength,
                            getIndex: ii * width,
                            setIndex: index,
                            range,
                            offset,
                        });
                        throw err;
                    }
                }
            }
            data = new Float32Array(arrayBuffer);
        }
        else
            throw Error(`Extension (${extension}) not supported.`);
        if ((update && metadata.ETag !== `"${createHash('md5').update(data.buffer).digest('hex')}"`)) {
            s3.putObject({
                Body: Buffer.from(data.buffer),
                Bucket,
                Key: vab.fragment(),
                ContentType: 'application/octet-stream',
                ACL: 'public-read',
            }, (err) => {
                if (err)
                    throw err;
            });
            console.log(`${!metadata ? "Created" : "Updated"} asset: ${vab.fragment()}`);
        }
    }
    return {
        source: returnSource ? lines : null,
        key: vab.fragment(),
        interval: vab.interval(),
        next: vab.next()
    };
};
const main = () => {
    [{
            key: "20200101025500-NCEI-L3C_GHRSST-SSTskin-AVHRR_Pathfinder-PFV5.3_NOAA19_G_2020001_night-v02.0-fv01.0",
            extension: "nc"
        }].forEach(({ key, extension }) => {
        if (extension === "nc") {
            (async () => {
                const data = readFileSync(`src/data/${key}.nc`);
                const reader = new NetCDFReader(data); // read the header
                s3.putObject({
                    Bucket,
                    Body: JSON.stringify({
                        variables: reader.variables,
                        version: reader.version
                    }),
                    ContentType: 'application/json',
                    Key: `${prefix}/${key}/variables.json`,
                }, (err) => {
                    if (err)
                        throw err;
                });
            })();
        }
        // let next = [0, MAX_SLICE_SIZE];  // next interval to process
        // let count = 0;  // counter for testing
        // let source = null;  // memoize the source data to speed up batches
        // (async () => {
        //     while (next && (!MAX_FRAGMENTS || count < MAX_FRAGMENTS)) {
        //         const [start, end] = next;
        //         let result = await VertexArrayBufferSlice({
        //             key,
        //             extension,
        //             prefix,
        //             start,
        //             end,
        //             source,
        //             returnSource: true,
        //             returnData: true
        //         });
        //         next = result.next;
        //         source = result.source;
        //         count += 1;
        //         delete result.source;
        //         result.dataUrl = result.dataUrl.slice(0,64);
        //         console.log({result});
        //     } 
        // })();
        // (async () => {
        //     const interval = (new IndexInterval(0, MAX_SLICE_SIZE, 36)).interval();
        //     const data = new Float32Array((await s3.getObject({
        //         Bucket,
        //         Key: `${prefix}/${key}/nodes/${interval.hash}`
        //     }).promise()).Body.buffer);
        //     const base64 = Buffer.from(data.buffer).toString("base64");
        //     const dv = new DataView(Buffer.from(base64, "base64").buffer);
        //     console.log({
        //         base64: `${base64.slice(0,16)}...`,
        //         sample: dv.getFloat32(0, true),
        //     });
        // })();
    });
};
exports.main = main;
