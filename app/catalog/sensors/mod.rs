use serde::{Serialize,Deserialize};
use std::collections::HashMap;

/**
 * Sensors are devices that convert a phenomenon to a digital signal.
 */

 #[derive(Debug, Serialize, Deserialize)]
 #[serde(rename_all = "camelCase")]
 struct Sensors{
     
     name: Option<String>,
     
     uuid: Option<String>,
     
     description: Option<String>,
     
     encoding_type: Option<String>,
     
     metadata: Option<HashMap<String, String>>
 }
 
 impl Sensors {
     pub fn new(
         name: Option<String>,
         uuid: Option<String>,
         description: Option<String>,
         encoding_type: Option<String>,
         metadata: Option<HashMap<String, String>>
     ) -> Self {
         Sensors {
             name,
             uuid,
             description,
             encoding_type,
             metadata
         }
     }
 }