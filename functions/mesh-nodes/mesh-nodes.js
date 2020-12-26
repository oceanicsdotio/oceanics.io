const { Endpoint, S3 } = require("aws-sdk");
const { createHash } = require("crypto");
const { performance } = require("perf_hooks");

const Bucket = "oceanicsdotio";
const s3 = new S3({
    endpoint: new Endpoint('nyc3.digitaloceanspaces.com'),
    accessKeyId: process.env.SPACES_ACCESS_KEY,
    secretAccessKey: process.env.SPACES_SECRET_KEY
});

const WEBGL_VERTEX_ARRAY_LIMIT = 65536;
const ENCODER_RADIX = 36;
const MAX_SLICE_SIZE = WEBGL_VERTEX_ARRAY_LIMIT/8;
exports.MAX_SLICE_SIZE = MAX_SLICE_SIZE;


/**
 * Reversibly combine two integers into a single integer. 
 * 
 * Broken out as a utility function for testing purposes. See "Cantor Pairing Functions". 
 * 
 * @param {*} a 
 * @param {*} b 
 */
const encodeInterval = (a, b) => {
    if (b < 0 || a < 0) throw Error(`Negative index (${a}, ${b})`);
    [a, b] = [a, b].sort();
    if (b - a > MAX_SLICE_SIZE) throw Error(`Exceeded maximum slice length (${MAX_SLICE_SIZE})`);
    const reduced = (a+b) * (a+b+1) / 2 + b;
    return reduced.toString(ENCODER_RADIX);
};
exports.encodeInterval = encodeInterval;


/**
 * Reverse the Cantor pairing function. This is the inverse of `c = encodeInterval(a, b)`.
 * 
 * Broken out as utility function for testing purposes. 
 * @param {*} c 
 */
const decodeInterval = (c) => {
    const _c = parseInt(c, ENCODER_RADIX);
    if (_c < 0) throw Error(`Negative index (${a}, ${b})`);
    const w = Math.floor((Math.sqrt(8*_c + 1) - 1) / 2);
    const t = w*(w+1)/2;
    const b = _c - t;
    const a = w - b;
    return [a, b];
};
exports.decodeInterval = decodeInterval;


const encodeArray = ({data: {buffer}}) => {
    return Buffer.from(buffer)
};


const decodeArray = ({data}) => {
   return new Float32Array(data);
};


/**
 * Make slices of the Vertex Array Buffer for the points that form the 
 * spatial dimensions of the graph.
 * 
 * The function limits the length of the buffer and precision of the points.
 * The result is appropriate for visualization in web applications.
 */
const VertexArrayBufferSlice = async ({
    prefix,
    key,
    extension,
    start,
    end,
    update=false,
    source=null,
    returnSource=false,
    returnData=false
}) => {

    const startTime = performance.now();
    const delta = end - start;
    const interval = encodeInterval(start, end);
    const fragmentKey = `${prefix}/nodes/${interval}`;

    let lines = null;
    let total = null;
    let data = null;
    
    // Check for existing fragment
    const metadata = await s3.headObject({
        Bucket,
        Key: fragmentKey
    }).promise().catch(err => {
        if (err.code === "NotFound") return null;
        else throw err;
    });

    
    if (!metadata || update) {

        lines = source || (await s3.getObject({
            Bucket,
            Key: `${prefix}/${key}.${extension}`
        }).promise()).Body.toString('utf-8').split("\r\n");
       
        total = lines.length;
        if (start > total || end > total || start < 0 || end < 0) 
            throw Error(`Index (${start},${end}) out of range (0,${total})`);
    
        // Lazy load lines if necessary
        data = new Float32Array(
            lines
                .slice(start, end)
                .reduce((acc, line, ii) => {
                    if (ii && !(ii % 2**12)) console.log(`Processing line ${ii}/${delta}...`);
    
                    return acc.concat(
                        line.split(",")
                        .slice(1, 4)
                        .map(x => parseFloat(x.trim()))
                    )
                },[])
        );
        
    } else {
        total = parseInt(metadata.Metadata.total);
        data = decodeArray({
            data: (await s3.getObject({
                Bucket,
                Key: fragmentKey
            }).promise()).Body
        });
    }
    
    // Add a file to a Space
    if (!metadata || (update && metadata.ETag !== `"${createHash('md5').update(data.buffer).digest('hex')}"`)) {
        s3.putObject({
            Body: encodeArray({data}),
            Bucket,
            Key: fragmentKey,
            ContentType: 'application/octet-stream',
            Metadata: {"total": `${total}`}
        }, (err) => {
            if (err) throw err;
        });
        console.log(`${!metadata ? "Created" : "Updated"} asset: ${fragmentKey}`);
    }

    const [_start, _end] = [
        Math.min(end, total), 
        Math.min(end+delta, total)
    ];

    return {
        data: returnData ? Buffer.from(data.buffer).toString("base64") : null,
        source: returnSource ? lines : null,
        key: fragmentKey,
        interval: decodeInterval(interval),
        next: _start === _end ? null : [_start, _end],
        total,
        elapsed: Math.ceil(performance.now() - startTime)
    };
};
exports.VertexArrayBufferSlice = VertexArrayBufferSlice;


const headers = {
    'Access-Control-Allow-Origin': '*',
    
  };
  
  if (event.httpMethod !== 'POST') {
exports.handler = async ({
    queryStringParameters: {
        prefix,
        key,
        start=0,
        end=MAX_SLICE_SIZE,
    }
}) => {
    try {            
        return {
            body: (await VertexArrayBufferSlice({
                prefix,
                key,
                start,
                end,
                returnData: true
            })).data,
            headers: {
                'Content-type': 'application/octet-stream',
                'Access-Control-Allow-Origin': "*",
            },
            isBase64Encoded: true,
            statusCode: 200,
        };
    } catch (err) {
        return { 
            statusCode: err.statusCode || 500, 
            body: err.message
        };
    }
};