

const { VertexArrayBufferSlice, MAX_SLICE_SIZE } = require("./mesh-nodes");

let next = [0, 512];
let count = 0;
let MAX_FRAGMENTS = 2;
let source = null;

(async () => {
    while (next && (!MAX_FRAGMENTS || count < MAX_FRAGMENTS)) {
        const [start, end] = next;
        let result = await VertexArrayBufferSlice({
            prefix: "MidcoastMaineMesh",
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
