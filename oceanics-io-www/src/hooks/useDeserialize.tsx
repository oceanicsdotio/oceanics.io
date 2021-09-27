 /**
  * Array of references component, no heading
  */
 import {Document} from "oceanics-io-ui/build/components/References/types";
 import type {DocumentSerializedType} from "oceanics-io-ui/build/components/References/types";
 import { useMemo } from "react";
 
const useDeserialize = (documents: DocumentSerializedType[]) => {
    
    const deserialized = useMemo(() => {
        return documents.map((doc) => {
            try {
                return new Document(doc)
            } catch {
                throw Error(`Metadata, ${JSON.stringify(doc)}`)
            }
        });
      }, []);

    return deserialized
 }

 export default useDeserialize;
  
