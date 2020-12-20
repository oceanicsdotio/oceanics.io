const { hello_world } = require("./pkg/squall");
const { Endpoint, S3 } = require('aws-sdk');

exports.handler = async ({
    queryStringParameters: {
        ContinuationToken
    }
}) => {
    try {
        const spacesEndpoint = new Endpoint('nyc3.digitaloceanspaces.com');
        const s3 = new S3({
            endpoint: spacesEndpoint,
            accessKeyId: process.env.SPACES_ACCESS_KEY,
            secretAccessKey: process.env.SPACES_SECRET_KEY
        });

        const message = hello_world("you");

        // Add a file to a Space
        s3.putObject({
            Body: message,
            Bucket: "oceanicsdotio",
            Key: "squall-test-message.txt",
        }, (err) => {
            if (err) throw err;
        });
           
        return {
            statusCode: 200,
            body: JSON.stringify(
                await s3.listObjectsV2({
                    ContinuationToken,
                    Bucket: "oceanicsdotio",
                    MaxKeys: 100
                }).promise()
            ),
        };
         
    } catch (err) {
        return { 
            statusCode: err.statusCode || 500, 
            body: err.message 
        };
    }
};
