const { Endpoint, S3 } = require("aws-sdk");
const { createHash } = require("crypto");
const { VertexArrayBuffer } = require("./pkg/neritics");

const endpoint = 'nyc3.digitaloceanspaces.com';
const Bucket = "oceanicsdotio";
const s3 = new S3({
    endpoint: new Endpoint(endpoint),
    accessKeyId: process.env.SPACES_ACCESS_KEY,
    secretAccessKey: process.env.SPACES_SECRET_KEY
});

const WEBGL_VERTEX_ARRAY_LIMIT = 65536;
const ENCODER_RADIX = 36;
const MAX_SLICE_SIZE = WEBGL_VERTEX_ARRAY_LIMIT/8;
exports.MAX_SLICE_SIZE = MAX_SLICE_SIZE;


const textData = async (Key) => 
    (await s3.getObject({Bucket, Key}).promise()).Body.toString('utf-8');


const fromCsvString = (csvString) => {
    
    const lines = csvString.split("\r\n")
    const total = lines.length;
    if (start > total || start < 0 || end < 0) 
        throw Error(`Index (${start},${end}) out of range (0,${total})`);
    const stop = Math.min(end, total);
    

    // Lazy load lines if necessary
    return new Float32Array(
        lines
            .slice(start, stop)
            .reduce((acc, line, ii) => {
                if (ii && !(ii % 2**12)) console.log(`Processing line ${ii}/${stop-start}...`);

                return acc.concat(
                    line.split(",")
                    .slice(1, 4)
                    .map(x => parseFloat(x.trim()))
                )
            },[])
    );
}



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
    radix=ENCODER_RADIX,
}) => {

    const vab = new VertexArrayBuffer(prefix, key, start, end, radix);
    
    let lines = null;
    
    // Check for existing fragment
    const metadata = await s3.headObject({
        Bucket,
        Key: vab.fragment()
    }).promise().catch(err => {
        if (err.code === "NotFound") return null;
        else throw err;
    });

    
    if (!metadata || update) {

        let data = null;

        if (extension === "csv") {
            lines = source || (await textData(`${prefix}/${key}.${extension}`)).split("\r\n");  // Lazy load lines if necessary    
            data = fromCsvString(lines)
        } else if (extension === "nc") {

            const {variables} = JSON.parse(await textData(`${prefix}/${key}/variables.json`));

            const width = 4;
            const keys = {"lon": 0, "lat": 1, "h": 2};
            const vars = variables.filter(({name}) => name in keys);
            const arrayBuffer = new ArrayBuffer((delta)*3*width);
            const dv = new DataView(arrayBuffer);

           
            for (const k in vars) {

                const {offset, size, name} = vars[k];
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

        if ((update && metadata.ETag !== `"${createHash('md5').update(data.buffer).digest('hex')}"`)) {
            s3.putObject({
                Body: Buffer.from(data.buffer),
                Bucket,
                Key: vab.fragment(),
                ContentType: 'application/octet-stream',
                ACL:'public-read',
            }, (err) => {
                if (err) throw err;
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
exports.VertexArrayBufferSlice = VertexArrayBufferSlice;
