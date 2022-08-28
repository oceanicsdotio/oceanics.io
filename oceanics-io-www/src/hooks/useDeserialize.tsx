import { useMemo } from "react";

import { Memo } from "oceanics-io-www-wasm";
import type { SerializedMemo } from "oceanics-io-www-wasm";

/**
 * 
 * @param documents 
 * @returns 
 */
const useDeserialize = (documents: SerializedMemo[]) => {
  const deserialized = useMemo(() => {
    return documents.map((doc) => new Memo(doc));
  }, []);

  return deserialized;
};

export default useDeserialize;
