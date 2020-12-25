const { Endpoint, S3 } = require('aws-sdk');
const { createHash } = require("crypto");

const spacesEndpoint = new Endpoint('nyc3.digitaloceanspaces.com');
const Bucket = "oceanicsdotio";
const s3 = new S3({
    endpoint: spacesEndpoint,
    accessKeyId: process.env.SPACES_ACCESS_KEY,
    secretAccessKey: process.env.SPACES_SECRET_KEY
});


/**
 * Browse saved results for a single model configuration. 
 * Results from different configurations are probably not
 * directly comparable, so we reduce the chances that someone 
 * makes wild conclusions comparing numerically
 * different models.

 * You can only access results for that test, although multiple collections * may be stored in a single place 
 */
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
                .mapFlat(line =>
                    line.split(",")
                        .slice(1, 4)
                        .map(x => parseFloat(x.trim()))
                    )
        );

        const blob = new Blob([flatBuffer])

        const _ = await s3.putObject({
            Bucket,
            Key: `${Service}/${Key}.bin`,
            Body: blob,
            ContentType: 'application/octet-stream'
        });

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/octet-stream' },
            body: blob
        }; 
    } catch (err) {
        return { 
            statusCode: err.statusCode || 500, 
            body: err.message
        };
    }
}
