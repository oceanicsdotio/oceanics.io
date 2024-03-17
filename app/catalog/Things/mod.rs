use serde::{Serialize, Deserialize};
use std::collections::HashMap;


/** 
 * A thing is an object of the physical or information world that is capable of of being identified
 * and integrated into communication networks.
 */

 #[derive(Debug, Serialize, Deserialize)]
 #[serde(rename_all = "camelCase")]
 struct Things {
     
     uuid: Option<String>,
     
     name: Option<String>,
     
     description: Option<String>,
     
     properties: Option<HashMap<String, String>>
 }
 
 
 /**
  *  implementation of Things
  */
 
 impl Things {
     
     pub fn new(
         uuid: Option<String>,
         name: Option<String>,
         description: Option<String>,
         properties: Option<HashMap<String, String>>
     ) -> Self {
         Things {
             uuid,
             name,
             description,
             properties
         }
     }
 }

