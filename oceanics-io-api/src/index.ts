import * as db from "./shared/queries";
import { Router, paths } from "./shared/middleware";
import type { ApiHandler } from "./shared/middleware";
import {allLabelsQuery} from "oceanics-io-api-wasm";

/**
 * Get an array of all collections by Node type
 */
const GET: ApiHandler = async () => {
  const query = allLabelsQuery();
  const data = (await db.readAndParseLabels(query)).map((name: string) => {
    return {
      name,
      url: `/api/${name}`
    }
  })
  return {
    statusCode: 200,
    data
  };
}

export const handler = Router({GET}, paths["/"])
