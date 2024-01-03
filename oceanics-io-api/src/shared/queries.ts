import neo4j from "neo4j-driver";
import type { Record, QueryResult, SessionMode } from "neo4j-driver";

type Properties = { [key: string]: unknown };

/**
 * Connect to graph database using the service account credentials.
 */
const connect = async (queries: string[], defaultAccessMode: SessionMode) => {
    const driver = neo4j.driver(
        process.env.NEO4J_HOSTNAME ?? "",
        neo4j.auth.basic("neo4j", process.env.NEO4J_ACCESS_KEY ?? "")
    );
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

const read = (query: string) => connect([query], neo4j.session.READ)[0];

export const readAndParse = async (query: string): Promise<Properties[]> => 
    read(query).then(recordsToProperties);

export const readAndParseLabels = async (query: string): Promise<string[]> => {
    const {records} = await read(query);
    return records
        .flatMap((record: Record) => record.get(0))
}

export const write = (query: string) => connect([query], neo4j.session.WRITE)[0];

export const writeMany = (queries: string[]) => connect(queries, neo4j.session.WRITE);

export const writeAndParse = async (query: string): Promise<Properties[]> =>
    write(query).then(recordsToProperties);
