const { VertexArrayBufferSlice, MAX_SLICE_SIZE } = require("./mesh-nodes");

const { Endpoint, S3 } = require("aws-sdk");
const { IndexInterval } = require("./pkg/neritics");
const NetCDFReader = require('netcdfjs');
const {readFileSync} = require('fs');


const MAX_FRAGMENTS = null;  // practical limitation for testing
const Bucket = "oceanicsdotio";
const prefix = "MidcoastMaineMesh";
const s3 = new S3({
    endpoint: new Endpoint('nyc3.digitaloceanspaces.com'),
    accessKeyId: process.env.SPACES_ACCESS_KEY,
    secretAccessKey: process.env.SPACES_SECRET_KEY
});

const sources = [
    {
    key: "midcoast_nodes",
    extension: "csv",
},
{
    key: "necofs_gom3_mesh", // "midcoast_nodes",
    extension: "nc", // "csv",
}]


sources.forEach(({key, extension}) => {

    if (extension === "nc") {
        (async () => {
            const data = readFileSync('src/data/necofs_gom3_mesh.nc');
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
                if (err) throw err;
            });
        })();
    }

    let next = [0, MAX_SLICE_SIZE];  // next interval to process
    let count = 0;  // counter for testing
    let source = null;  // memoize the source data to speed up batches
    
    (async () => {
        while (next && (!MAX_FRAGMENTS || count < MAX_FRAGMENTS)) {
            const [start, end] = next;
            let result = await VertexArrayBufferSlice({
                key,
                extension,
                prefix,
                start,
                end,
                source,
                returnSource: true,
                returnData: true
            });
        
            next = result.next;
            source = result.source;
            count += 1;
    
            delete result.source;
            result.dataUrl = result.dataUrl.slice(0,64);
    
            console.log({result});
        } 
    })();

    (async () => {

        const interval = (new IndexInterval(0, MAX_SLICE_SIZE, 36)).interval();

        const data = new Float32Array((await s3.getObject({
            Bucket,
            Key: `${prefix}/${key}/nodes/${interval.hash}`
        }).promise()).Body.buffer);
    
        const base64 = Buffer.from(data.buffer).toString("base64");
        const dv = new DataView(Buffer.from(base64, "base64").buffer);
    
        console.log({
            base64: `${base64.slice(0,16)}...`,
            sample: dv.getFloat32(0, true),
        });
    })();
});


