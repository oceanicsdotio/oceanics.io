/**
 * Cloud function version of API
 */
import { connect } from "../shared/shared";
import { parseAsNodes, GraphNode, Link } from "../shared/cypher";
import type { QueryResult, Record } from "neo4j-driver";
import type { Handler } from "@netlify/functions";
import jwt from "jsonwebtoken";
import crypto from "crypto";

/**
 * Generic interface for all of the method-specific handlers.
 */
interface IAuth {
    email: string;
    password: string;
    secret: string;
    apiKey?: string;
}

type Properties = {[key: string]: any};
interface INode {
    labels: string[];
    properties: Properties;
}

/**
 * Transform from Neo4j response records to generic internal node representation
 */
const transform = (recs: Record[]): [string, Properties][] =>
    recs.flatMap((record)=>Object.values(record.toObject()))
        .map(({ labels: [primary], properties }: INode) => [primary, properties])

/**
 * Securely store and anc compare passwords
 */
const hashPassword = (password: string, secret: string) =>
    crypto.pbkdf2Sync(password, secret, 100000, 64, "sha512").toString("hex");


const matchUser = async ({email, password, secret}: IAuth) => {
    const hash: string = hashPassword(password, secret);
    const node = new GraphNode(`email: '${email}', credential: '${hash}'`, null, ["User"]);
    const {records} = await connect(node.load("uuid").query);
    return transform(records);
}

const matchProvider = async ({apiKey}) => {
    const node = new GraphNode(`apiKey: '${apiKey}'`, "p", ["Provider"]);
    const {records} = await connect(node.load().query);
    return {node, records: transform(records)};
}

/**
 * Create a new account using email address
 */
const register = async ({ email, password, secret, apiKey }: IAuth) => {
    if (!(apiKey??false)) {
        const message = (
            "Registration requires a valid API key supplied as the `x-api-key`"+
            "or `apiKey` in the request body. This is used to associate your "+
            "account with a public or private ingress."
        );
        return { 
            statusCode: 400, 
            body: JSON.stringify({message})
        };
    }

    const hash: string = hashPassword(password, secret);
    const uuid: string = crypto.randomUUID().replace(/-/g, "");
    const user = new GraphNode(`email: '${email}', credential: '${hash}', uuid: '${uuid}'`, "u", ["User"]);
   
    const {node, records} = await matchProvider({apiKey});
    
    if (records.length!==1) {
        return {
            statusCode: 403,
            body: JSON.stringify({message: "Bad API key."})
        }
    }

    const cypher = new Link("Register", 0, 0, "").join(user, node)
    await connect(user.create().query);
    await connect(cypher.query);

    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({message: `Registered as a member of ${records[0][1].domain}.`})
    }
};

/**
 * Exchange user name and password for JWT
 */
const token = async ({ email, password, secret }: IAuth) => {
    const records = await matchUser({email, password, secret});
    const token = jwt.sign({
        "uuid": records
    }, secret, { expiresIn: 3600 });
    return {
        statusCode: 200,
        body: JSON.stringify({ token }),
        headers: { 'Content-Type': 'application/json' },
    }
};

/**
 * Update account information
 */
const manage = async ({ email, password, secret }: IAuth) => {
    // parse
    const records = await matchUser({email, password, secret});
    if (records.length !== 1) {
        return {
            statusCode: 403,
            body: JSON.stringify({message: ""})
        }
    } 

    const [previous, insert] = parseAsNodes([{ uuid: records[0].properties.uuid }, { password, email }]);
    const cypher = previous.mutate(insert);
    await connect(cypher.query);
    return {
        statusCode: 204
    }
};


/**
 * Browse saved results for a single model configuration. 
 * Results from different configurations are probably not
 * directly comparable, so we reduce the chances that someone 
 * makes wild conclusions comparing numerically
 * different models.
 
 * You can only access results for that test, although multiple collections * may be stored in a single place 
 */
const handler: Handler = async ({ headers, body, httpMethod }) => {
    let { email, password, apiKey, secret } = JSON.parse(body ?? "{}");
    switch (httpMethod) {
        case "GET":
            [email, password, secret] = headers["authorization"].split(":");
            return token({ email, password, secret });
        case "POST":
            return register({ email, password, secret, apiKey });
        case "PUT":
            [email, password, secret] = headers["authorization"].split(":");
            return manage({ email, password, secret });
        default:
            return {
                statusCode: 405,
                body: JSON.stringify({ message: `Invalid HTTP Method` }),
                headers: { 'Content-Type': 'application/json' },
            };
    }
}

export { handler }