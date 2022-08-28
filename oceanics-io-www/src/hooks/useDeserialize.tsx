import { useMemo } from "react";

import { Document } from "../components/References/types";
import type { DocumentSerializedType } from "../components/References/types";

/**
 * 
 * @param documents 
 * @returns 
 */
const useDeserialize = (documents: DocumentSerializedType[]) => {
  const deserialized = useMemo(() => {
    return documents.map((doc) => new Document(doc));
  }, []);

  return deserialized;
};

export default useDeserialize;
