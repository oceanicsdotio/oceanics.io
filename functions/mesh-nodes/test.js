const { VertexArrayBufferSlice, MAX_SLICE_SIZE, encodeInterval } = require("./mesh-nodes");

const { Endpoint, S3 } = require("aws-sdk");

const Bucket = "oceanicsdotio";
const prefix = "MidcoastMaineMesh";
const s3 = new S3({
    endpoint: new Endpoint('nyc3.digitaloceanspaces.com'),
    accessKeyId: process.env.SPACES_ACCESS_KEY,
    secretAccessKey: process.env.SPACES_SECRET_KEY
});


let next = [0, MAX_SLICE_SIZE];  // next interval to process
let count = 0;  // counter for testing
let MAX_FRAGMENTS = null;  // practical limitaions for testing
let source = null;  // memoize the source data to speed up batches

(async () => {
    while (next && (!MAX_FRAGMENTS || count < MAX_FRAGMENTS)) {
        const [start, end] = next;
        let result = await VertexArrayBufferSlice({
            prefix,
            key: "midcoast_nodes",
            extension: "csv",
            start,
            end,
            source,
            returnSource: true,
            returnData: false
        });
    
        next = result.next;
        source = result.source;
        count += 1;

        delete result.source;

        console.log({result});
    } 
})();

(async () => {
    const data = new Float32Array((await s3.getObject({
        Bucket,
        Key: `${prefix}/nodes/${encodeInterval(0, MAX_SLICE_SIZE)}`
    }).promise()).Body.buffer);
    console.log({
        data,
        base64: Buffer.from(data.buffer).toString("base64").slice(0,100)
    });
})();



