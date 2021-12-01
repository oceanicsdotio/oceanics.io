// @context
// def collection(db, entity):
//     # typing: (Driver, str) -> (dict, int)
//     """
//     SensorThings API capability #2

//     Get all entities of a single type.
//     """
//     # produce the serialized entity records
//     # pylint: disable=eval-used
//     value = [*map(lambda x: x.serialize(), load_node(eval(entity)(), db))]

//     return {"@iot.count": len(value), "value": value}, 200