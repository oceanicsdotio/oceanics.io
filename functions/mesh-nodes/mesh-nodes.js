const { Endpoint, S3 } = require('aws-sdk');
const { createHash } = require("crypto");

const spacesEndpoint = new Endpoint('nyc3.digitaloceanspaces.com');
const Bucket = "oceanicsdotio";
const s3 = new S3({
    endpoint: spacesEndpoint,
    accessKeyId: process.env.SPACES_ACCESS_KEY,
    secretAccessKey: process.env.SPACES_SECRET_KEY
});


exports.handler = async ({
    queryStringParameters: {
        Service="MidcoastMaineMesh",
        Key="midcoast_nodes",
        Ext="csv",
        PagingStart=null,
        PagingEnd=null,
    }
}) => {
    try {    
        const {Body} = await s3.getObject({
            Bucket,
            Key: `${Service}/${Key}.${Ext}`
        }).promise();

        const lines = Body
            .toString('utf-8')
            .split("\n");

        const paging = [
            Math.min(PagingStart || 0, lines.length),
            Math.min(PagingEnd || lines.length, lines.length)
        ];
            
        const flatBuffer = new Float32Array(
            lines
                .slice(...paging)
                .flatMap(line =>
                    line.split(",")
                        .slice(1, 4)
                        .map(x => parseFloat(x.trim()))
                    )
        );

        // Add a file to a Space
        s3.putObject({
            Body: flatBuffer.buffer,
            Bucket,
            Key: `${Service}/${Key}.bin`,
            ContentType: 'application/octet-stream'
        }, (err) => {
            if (err) throw err;
        });

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/octet-stream' },
            body: flatBuffer.buffer
        }; 
    } catch (err) {
        return { 
            statusCode: err.statusCode || 500, 
            body: err.message
        };
    }
}
