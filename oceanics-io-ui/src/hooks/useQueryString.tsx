import { useCallback, useMemo } from "react";

type QueryParams = {
  items?: number;
  tag?: string;
  reference?: number;
};

type Fixtures = {
  query?: QueryParams;
  navigateWithQuery: (insert: QueryParams) => void;
};

/**
 * Go from object to valid local URL
 */
const encode = (params: QueryParams) =>
  new URLSearchParams(
    Object.entries(params).map(([key, value])=>[key, `${value}`])
  ).toString();

export default (
  search: string, 
  defaults: QueryParams, 
  navigate: Function
): Fixtures => {

  /**
   * Go from search string to object with parsed numeric values
   */
  const query: QueryParams = useMemo(() => {
    const params = new URLSearchParams(search);
    return {
      items: parseInt(params.get("items") || `${defaults.items}`),
      tag: params.get("tag") || defaults.tag,
      reference: parseInt(params.get("reference") || `${defaults.reference}`),
    };
  }, [search, defaults]);
  
  const navigateWithQuery = useCallback((insert: QueryParams) => {
    navigate(`/?${encode({...query, ...insert})}`);
  }, [navigate, search]);

  return {
    query,
    navigateWithQuery
  }

}