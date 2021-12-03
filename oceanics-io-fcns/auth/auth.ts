/**
 * Cloud function version of API
 */
import { connect } from "../shared/shared";
import { parseAsNodes, GraphNode, Link } from "../shared/cypher";
import type { Record } from "neo4j-driver";
import type { Handler } from "@netlify/functions";
import jwt, {JwtPayload} from "jsonwebtoken";
import crypto from "crypto";

/**
 * Generic interface for all of the method-specific handlers.
 */
interface IAuth {
    email: string;
    password: string;
    secret: string;
    apiKey?: string;
    token?: string;
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

/**
 * Make sure we don't leak anything...
 */
function catchAll(wrapped: (args: any) => any) {
    return (args: any) => {
        try {
            return wrapped(args);
        } catch {
            return {
                statusCode: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({message: "Server Error"})
            }
        }
    }
}

/**
 * Create a new account using email address
 */
const register = async ({ email, password, secret, apiKey }: IAuth) => {
    const hash: string = hashPassword(password, secret);
    const uuid: string = crypto.randomUUID().replace(/-/g, "");
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
const getToken = async ({ email, password, secret }: IAuth) => {
    const hash: string = hashPassword(password, secret);
    const node = new GraphNode(`email: '${email}', credential: '${hash}'`, null, ["User"]);
    const records = transform((await connect(node.load().query)).records);

    let statusCode: number;
    let body: string;

    if (records.length !== 1) {
        statusCode = 403;
        body = JSON.stringify({message: "Unauthorized"});
    } else {
        statusCode = 200;
        const {uuid} = records[0][1];
        const token = jwt.sign({uuid}, process.env.SIGNING_KEY, { expiresIn: 3600 });
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
    const claim: JwtPayload = jwt.verify(token, process.env.SIGNING_KEY) as JwtPayload;
    const uuid = claim["uuid"];
    const node = new GraphNode(`uuid: '${uuid}'`, null, ["User"]);
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
    switch (httpMethod) {
        case "GET":
            [email, password, secret] = headers["authorization"].split(":");
            return catchAll(getToken)({ email, password, secret });
        case "POST":
            return catchAll(register)({ email, password, secret, apiKey });
        case "PUT":
            const [_, token] = headers["authorization"].split(":");
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