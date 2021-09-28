 /**
  * Array of references component, no heading
  */
 import {Document} from "../components/References/types";
 import type {DocumentSerializedType} from "../components/References/types";
 import { useMemo } from "react";
 
const useDeserialize = (documents: DocumentSerializedType[]) => {
    
    const deserialized = useMemo(() => {
        return documents.map((doc) => new Document(doc));
      }, []);

    return deserialized
 }

 export default useDeserialize;
  
