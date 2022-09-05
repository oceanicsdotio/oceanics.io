import neo4j from "neo4j-driver";
import type { Record, QueryResult } from "neo4j-driver";
import { Node, Links, NodeConstraint } from "oceanics-io-api-wasm";

type Route = {name: string, url: string};

// Stub type for generic entity Properties object.
type Properties = { [key: string]: unknown };

const READ_ONLY = true;
const WRITE = false;

/**
 * Connect to graph database using the service account credentials,
 * and execute a single query. For convenience you can pass in a callback
 * to execute on the result.
 */
export const connect = async (query: string, readOnly: boolean) => {
    const driver = neo4j.driver(
        process.env.NEO4J_HOSTNAME ?? "",
        neo4j.auth.basic("neo4j", process.env.NEO4J_ACCESS_KEY ?? "")
    );
    const defaultAccessMode = readOnly ? neo4j.session.READ : neo4j.session.WRITE
    const session = driver.session({ defaultAccessMode });
    const result = await session.run(query);
    await driver.close();
    return result;
}

type RecordObject = {
    labels: string[]
    properties: Properties
}

// QueryResult to POJO
const recordsToObjects = ({ records }: QueryResult): RecordObject[] =>
    records.flatMap((record: Record) => Object.values(record.toObject()))

// Get just the properties, for example if requesting a single label
const getProperties = ({ properties }: RecordObject): Properties => properties

// Transform from Neo4j response records type to generic internal node representation.
const recordsToProperties = (result: QueryResult): Properties[] =>
    recordsToObjects(result).map(getProperties)

/**
 * Execute a query that returns Node data 
 */
export const node = async (query: string, readOnly: boolean) => {
    const result = await connect(query, readOnly);
    return recordsToProperties(result);
}

export const metadata = async (left: Node, right: Node): Promise<Properties[]> => {
    const link = new Links();
    const { query } = link.query(left, right, right.symbol);
    const result = await connect(query, READ_ONLY);
    return recordsToProperties(result);
}

export const index = async (): Promise<Route[]> => {
    const RESTRICTED = new Set(["Provider", "User"]);
    const filterAllowedLabels = (label: string) => !RESTRICTED.has(label);
    const recordToLabel = (record: Record) => record.get(0);
    const labelToRoute = (label: string): Route => Object({
        name: label,
        url: `/api/${label}`
    })
    const recordsToUniqueRoutes = ({ records }: QueryResult): Route[] => 
        records
            .flatMap(recordToLabel)
            .filter(filterAllowedLabels)
            .map(labelToRoute)

    const { query } = Node.allLabels();
    const result = await connect(query, READ_ONLY);
    return recordsToUniqueRoutes(result);
}

export const remove = (left: Node, right: Node): Promise<QueryResult> => {
    const link = new Links()
    const { query } = link.deleteChild(left, right);
    return connect(query, WRITE)
}

type AllowedLabels = "Create"|"Register";
export const create = (label: AllowedLabels, left: Node, right: Node): Promise<QueryResult> => {
    const link = new Links(label, 0, 0, "");
    const { query } = link.insert(left, right);
    return connect(query, WRITE)
}

export const register = async (left: Node, right: Node): Promise<string> => {
    const records = await create("Register", left, right).then(recordsToProperties)
    if (records.length !== 1)
      throw Error(`No provider match (N=${records.length})`);
    const [{domain}] = records as {domain: string}[];
    return domain;
}

export const auth = async (user: Node): Promise<Node> => {
    const {query} = user.load();
    const records = await connect(query, READ_ONLY).then(recordsToProperties);
    if (records.length === 0)
        throw Error(`Basic auth claim does not exist`)
    else if (records.length > 1) {
        throw Error(`Basic auth claim matches multiple accounts`)
    }
    return Node.user(JSON.stringify(records[0]));
}

export const drop = (label: string, left: Node, right: Node): Promise<QueryResult> => {
    const link = new Links(label);
    const {query} = link.drop(left, right);
    return connect(query, WRITE);
}

export const join = (label: string, left: Node, right: Node): Promise<QueryResult> => {
    const link = new Links(label);
    const {query} = link.join(left, right);
    return connect(query, WRITE);
}
    
/**
 * Connect to graph database using the service account credentials,
 * and execute a single query. For convenience you can pass in a callback
 * to execute on the result.
 */
export const batch = async (queries: string[], readOnly: boolean) => {
    const driver = neo4j.driver(
        process.env.NEO4J_HOSTNAME ?? "",
        neo4j.auth.basic("neo4j", process.env.NEO4J_ACCESS_KEY ?? "")
    );
    const defaultAccessMode = readOnly ? neo4j.session.READ : neo4j.session.WRITE
    const session = driver.session({ defaultAccessMode });
    const result = Promise.all(queries.map(query => session.run(query)));
    await driver.close();
    return result;
}

export const setup = (): string[] => {
    return [
        ["User", "email"],
        ["Provider", "apiKey"],
        ["Provider", "domain"]
    ].map(
        ([label, key]) => (new NodeConstraint(label, key)).createIndex().query
    )
}
