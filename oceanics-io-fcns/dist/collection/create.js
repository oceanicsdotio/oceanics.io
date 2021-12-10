"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
// import { connect } from "../shared/shared";
// import { GraphNode } from "../shared/cypher";
const handler = async ({}) => {
    // @context
    // def create(db, entity, body, provider) -> (dict, int):
    //     # typing: (Driver, str, dict, Providers) -> (dict, int)
    //     """
    //     Create a new node(s) in graph.
    //     Format object properties dictionary as list of key:"value" strings,
    //     automatically converting each object to string using its built-in __str__ converter.
    //     Special values can be given unique string serialization methods by overloading __str__.
    //     The bind tuple items are external methods that are bound as instance methods to allow
    //     for extending capabilities in an ad hoc way.
    //     Blank values are ignored and will not result in graph attributes. Blank values are:
    //     - None (python value)
    //     - "None" (string)
    //     Writing transactions are recursive, and can take a long time if the tasking graph
    //     has not yet been built. For this reason it is desirable to populate the graph
    //     with at least one instance of each data type.
    //     """
    //     # For changing case
    //     from bathysphere import REGEX_FCN
    //     # Only used for API discriminator
    //     _ = body.pop("entityClass")
    //     if entity == "Locations" and "location" in body.keys():
    //         body["location"] = SpatialLocationData(**body["location"])
    //     # Generate Node representation
    //     instance = eval(entity)(**{REGEX_FCN(k): v for k, v in body.items()}) # pylint: disable=eval-used
    //     _entity, _provider = parse_as_nodes((instance, provider))
    //     # Establish provenance
    //     link = Links(label="Create").join(_entity, _provider)
    //     # Execute the query
    //     with db.session() as session:
    //         session.write_transaction(lambda tx: tx.run(_entity.create().query))
    //         session.write_transaction(lambda tx: tx.run(link.query))
    //     # Report success
    //     return None, 204
    return {
        statusCode: 501,
        // headers: { 'Content-Type': 'application/json' },
        body: "Not implemented"
    };
};
exports.handler = handler;
