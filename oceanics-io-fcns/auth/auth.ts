/**
 * Cloud function version of API
 */
import { connect } from "../shared/shared";
import { parseAsNodes, GraphNode, Link } from "../shared/cypher";
import type { Record } from "neo4j-driver";
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
    const {records} = await connect(node.load().query);
    return transform(records);
}

/**
 * Create a new account using email address
 */
const register = async ({ email, password, secret, apiKey }: IAuth) => {
    const hash: string = hashPassword(password, secret);
    const uuid: string = crypto.randomUUID().replace(/-/g, "");
    const node = new GraphNode(`apiKey: '${apiKey}'`, "p", ["Provider"]);
    const user = new GraphNode(`email: '${email}', credential: '${hash}', uuid: '${uuid}'`, "u", ["User"]);
    const cypher = new Link("Register", 0, 0, "").insert(node, user)
    const {records} = await connect(cypher.query);

    let statusCode: number;
    let message: string;
    if (records.length!==1) {
        message = (
            "Registration requires a valid API key supplied as the `x-api-key`"+
            "or `apiKey` in the request body. This is used to associate your "+
            "account with a public or private ingress."
        );
        statusCode = 403;
    } else {
        message = `Registered as a member of ${transform(records)[0][1].domain}.`;
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
const token = async ({ email, password, secret }: IAuth) => {
    const records = await matchUser({email, password, secret});
    let statusCode: number;
    let body: string;
    if (records.length !== 1) {
        statusCode = 403;
        body = JSON.stringify({message: "Unauthorized"});
    } else {
        statusCode = 200;
        const token = jwt.sign({uuid: records[0][1].uuid}, secret, { expiresIn: 3600 });
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
const manage = async ({ email, password, secret }: IAuth) => {
    const records = await matchUser({email, password, secret});
    let statusCode: number;
    let body: string|undefined;
    if (records.length !== 1) {
        statusCode = 403,
        body = JSON.stringify({message: "Unauthorized"});
    } else {
        const [previous, insert] = parseAsNodes([{ uuid: records[0][1].uuid }, { password, email }]);
        const cypher = previous.mutate(insert);
        await connect(cypher.query);
        statusCode = 204;
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

export { handler };