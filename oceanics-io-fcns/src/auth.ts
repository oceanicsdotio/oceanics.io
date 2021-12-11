/**
 * Cloud function version of API
 */
import { connect, hashPassword, uuid4, catchAll } from "./shared/utils";
import { parseAsNodes, GraphNode, Link, Properties, transform, authClaim, tokenClaim, createToken, IAuth } from "./shared/cypher";
import type { Handler } from "@netlify/functions";

/**
 * Create a new account using email address
 */
const register = async ({ email, password, secret, apiKey }: IAuth) => {
    const hash: string = hashPassword(password, secret);
    const uuid: string = uuid4();
    const node = new GraphNode(`apiKey: '${apiKey}'`, "p", ["Provider"]);
    const user = new GraphNode(`email: '${email}', credential: '${hash}', uuid: '${uuid}'`, "u", ["User"]);
    const cypher = new Link("Register", 0, 0, "").insert(node, user);

    let records: [string, Properties][];
    let statusCode: number;
    let message: string;

    try {
        records = transform((await connect(cypher.query)).records);
    } catch {
        records = [];
    }
    if (records.length!==1) {
        message = (
            "Registration requires email, password, and API key in the request body. "+
            "This is used to associate your account with a public or private ingress."
        );
        statusCode = 403;
    } else {
        message = `Registered as a member of ${records[0][1].domain}.`;
        statusCode = 200;
    }
    return {
        statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({message})
    }
};


/**
 * Exchange user name and password for JWT
 */
const getToken = async (auth: IAuth) => {
    
    const node = authClaim(auth)
    const records = transform((await connect(node.load().query)).records);

    let statusCode: number;
    let body: string;

    if (records.length !== 1) {
        statusCode = 403;
        body = JSON.stringify({message: "Unauthorized"});
    } else {
        statusCode = 200;
        const {uuid} = records[0][1];
        const token = createToken(uuid, process.env.SIGNING_KEY);
        body = JSON.stringify({ token })
    }
    return {
        statusCode,
        body,
        headers: { 'Content-Type': 'application/json' },
    }
};


/**
 * Update account information
 */
const manage = async ({token, email, password}: IAuth) => {

    console.log(token)
  
    const node = tokenClaim(token, process.env.SIGNING_KEY);
    const records = transform((await connect(node.load().query)).records);

    let statusCode: number;
    let body: string|undefined;

    if (records.length !== 1) {
        statusCode = 403,
        body = JSON.stringify({message: "Unauthorized"});
    } else {
        // const [previous, insert] = parseAsNodes([{ uuid: records[0][1].uuid }, { password, email }]);
        // const cypher = previous.mutate(insert);
        // await connect(cypher.query);
        statusCode = 200;
        body = JSON.stringify({message: "OK"});
    }
    return {
        statusCode,
        body
    }
};

/**
 * Browse saved results for a single model configuration. 
 * Results from different configurations are probably not
 * directly comparable, so we reduce the chances that someone 
 * makes wild conclusions comparing numerically
 * different models.
 *
 * You can only access results for that test, although multiple collections * may be stored in a single place 
 */
const handler: Handler = async ({ headers, body, httpMethod }) => {
    let { email, password, apiKey, secret } = JSON.parse(body ?? "{}");
    const auth = headers["authorization"]??"";
    switch (httpMethod) {
        case "GET":
            [email, password, secret] = auth.split(":");
            return catchAll(getToken)({ email, password, secret });
        case "POST":
            return catchAll(register)({ email, password, secret, apiKey });
        case "PUT":
            const [_, token] = auth.split(":");
            return catchAll(manage)({token, email, password});
        default:
            return {
                statusCode: 405,
                body: JSON.stringify({ message: `Invalid HTTP Method` }),
                headers: { 'Content-Type': 'application/json' },
            };
    }
}

export { handler };