CALL apoc.load.jdbc('jdbc:postgresql://bathysphere-do-user-3962990-0.db.ondigitalocean.com:25060/bathysphere?user=bathysphere&password=de2innbnm1w6r27y','SELECT last_name FROM limited_purpose_aquaculture_sites;')
YIELD row
MERGE (c:Collections { name: row.last_name, description: 'farm operator' })
  ON CREATE SET c.name = row.last_name
MERGE (t:Things { name: row.site_id, description: row.species }) WHERE row.site_id
  ON CREATE SET t.name = row.site_id
MERGE (c)-[:Linked]-(t)
RETURN c