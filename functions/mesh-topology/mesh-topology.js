const { Endpoint, S3 } = require('aws-sdk');

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
        Key="midcoast_elements",
        Ext="csv",
    }
}) => {
    try {    
        const {Body} = await s3.getObject({
            Bucket,
            Key: `${Service}/${Key}.${Ext}`
        }).promise();

        const CSV = Body.toString('utf-8')
            .split("\n")
            .map(line => {
                line
                    .trim()
                    .split(",")
                    .map(word => word.trim())
                    .slice(1, 4)
                    .map(word => parseInt(word))
            });

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(CSV)
            //     CSV, 
            //     function(key, val) {
            //         if (isNaN(+key)) return val;
            //         return val.toFixed ? Number(val.toFixed(5)) : val;
            //     }
            // )
        }; 
    } catch (err) {
        return { 
            statusCode: err.statusCode || 500, 
            body: err.message
        };
    }
}
