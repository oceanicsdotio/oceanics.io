/**
 * Cloud function version of API
 */
const {connect} = require("../../shared/shared");
const {hello_world} = require("../../shared/pkg/neritics");

 /**
  * Browse saved results for a single model configuration. 
  * Results from different configurations are probably not
  * directly comparable, so we reduce the chances that someone 
  * makes wild conclusions comparing numerically
  * different models.
 
  * You can only access results for that test, although multiple collections * may be stored in a single place 
  */
exports.handler = async (event) => {

    let response;
    const data = await connect("SHOW FUNCTIONS");

    try {    
    response = {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                data,
                message: hello_world("you")
        })
        }; 
    } catch (err) {
        response = { 
            statusCode: err.statusCode || 500, 
            body: err.message
        };
    }
    return response
}
