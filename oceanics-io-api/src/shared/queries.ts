import neo4j from "neo4j-driver";
import type { Record, QueryResult } from "neo4j-driver";

type Route = {name: string, url: string};
type Properties = { [key: string]: unknown };

const READ_ONLY = true;
const WRITE = false;

/**
 * Connect to graph database using the service account credentials.
 */
const connect = async (queries: string[], readOnly: boolean) => {
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

// Transform from Neo4j response records type to generic internal node representation.
const recordsToProperties = ({records}: QueryResult): Properties[] => {
    return records
        .flatMap((record: Record) => Object.values(record.toObject()))
        .map(({ properties }: { properties: Properties }) => properties)
}

const read = (query: string) => connect([query], READ_ONLY)[0];

export const readAndParse = async (query: string): Promise<Properties[]> => 
    read(query).then(recordsToProperties);

export const readAndParseLabels = async (query: string): Promise<Route[]> => {
    const {records} = await read(query);
    return records
        .flatMap((record: Record) => record.get(0))
        .map((name: string): Route => Object({
            name,
            url: `/api/${name}`
        }))
}

export const verifyAuthClaim = async (query: string): Promise<Properties> => {
    const records = await readAndParse(query);
    if (records.length === 0)
        throw Error(`Basic auth claim does not exist`)
    else if (records.length > 1) {
        throw Error(`Basic auth claim matches multiple accounts`)
    }
    return records[0];
}

export const write = (query: string) => connect([query], WRITE)[0];

export const writeMany = (queries: string[]) => connect(queries, WRITE);

export const writeAndParse = async (query: string): Promise<Properties[]> =>
    write(query).then(recordsToProperties);
