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
 * Reversibly combine two integers into a single integer. In this case we are segmenting
 * the linear index of an ordered array, to break it into chunks named with the hash
 * of their own interval. 
 * 
 * The interval is implicit in the hash, and can be extracted to rebuild the entire array
 * by concatenating the chunks. 
 * 
 * This is intended to be used for vertex arrays, but can be applied generally to any
 * single or multidimensional arrays. 
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


/**
 * Array encoder for NodeJS side of things. 
 */
const encodeArray = ({data: {buffer}}) => {
    return Buffer.from(buffer)
};

/**
 * Array decoder that is valide both for backend and browser. 
 * @param {*} param0 
 */
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
    const fragmentKey = `${prefix}/${key}/nodes/${interval}`;

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

        if (extension === "csv") {
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
        } else if (extension === "nc") {

            const {variables} = JSON.parse((await s3.getObject({
                Bucket,
                Key: `${prefix}/${key}/variables.json`
            }).promise()).Body.toString('utf-8'));

            const width = 4;
            const keys = {"lon": 0, "lat": 1, "h": 2};
            const vars = variables.filter(({name}) => name in keys);
            const arrayBuffer = new ArrayBuffer((delta)*3*width);
            const dv = new DataView(arrayBuffer);
;
           
            for (const k in vars) {

                const {offset, size, name} = vars[k];

                total = size / width;

                const range = [
                    offset+start*width,
                    offset+end*width*4
                ];

                const view = new DataView((await s3.getObject({
                    Bucket,
                    Key: `${prefix}/${key}.${extension}`,
                    Range: `bytes=${range[0]}-${range[1]}`
                }).promise()).Body.buffer);

                for (let ii = 0; ii < (delta-1); ii++) {
                    const index = (ii * 3 + keys[name]) * width;
                    try {
                        const value = view.getFloat32(ii*width, false);
                        dv.setFloat32(index, value, true);  // swap endiannesskeys
                    } catch (err) {
                        console.log({
                            delta, 
                            deltaX4: delta * 4,
                            length: view.buffer.byteLength, 
                            getIndex: ii*width,
                            setIndex: index,
                            range,
                            offset,
                        });
                        throw err;
                    } 
                }
            }

            data = new Float32Array(arrayBuffer);
    
        } else 
            throw Error(`Extension (${extension}) not supported.`);

      
    } else {
        total = parseInt(metadata.Metadata.total);
        data = decodeArray({
            data: (await s3.getObject({
                Bucket,
                Key: fragmentKey
            }).promise()).Body.buffer
        });
    }
    
    // Add a file to a Space
    if (!metadata || (update && metadata.ETag !== `"${createHash('md5').update(data.buffer).digest('hex')}"`)) {
        s3.putObject({
            Body: encodeArray({data}),
            Bucket,
            Key: fragmentKey,
            ContentType: 'application/octet-stream',
            ACL:'public-read',
            Metadata: {
                "total": `${total}`
            }
        }, (err) => {
            if (err) throw err;
        });
        console.log(`${!metadata ? "Created" : "Updated"} asset: ${fragmentKey}`);
    }

    // Calculate the actual start and end values for paging
    const [_start, _end] = [
        Math.min(end, total), 
        Math.min(end+delta, total)
    ];

    return {
        dataUrl: returnData ? "data:application/octet;base64,"+Buffer.from(data.buffer).toString("base64") : null,
        source: returnSource ? lines : null,
        key: fragmentKey,
        interval: decodeInterval(interval),
        next: _start === _end ? null : [_start, _end],
        total,
        elapsed: Math.ceil(performance.now() - startTime)
    };
};
exports.VertexArrayBufferSlice = VertexArrayBufferSlice;


/**
 * Handler to expose for Netlify/AWS Lambda Functions.
 * 
 * @param {*} param0 
 */
exports.handler = async ({
    queryStringParameters: {
        prefix,
        key,
        extension,
        start=0,
        end=MAX_SLICE_SIZE,
    }
}) => {
    try {       
        
        const result = await VertexArrayBufferSlice({
            prefix,
            key,
            extension,
            start: parseInt(start),
            end: parseInt(end),
            returnData: true
        });

        return {
            body: JSON.stringify(result),
            headers: {
                'Content-type': 'application/json',
                'Access-Control-Allow-Origin': "*",
            },
            statusCode: 200,
        };
    } catch (err) {
        return { 
            statusCode: err.statusCode || 500, 
            body: err.message
        };
    }
};