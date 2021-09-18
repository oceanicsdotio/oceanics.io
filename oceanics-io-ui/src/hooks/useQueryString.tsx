import { useCallback } from "@storybook/react/node_modules/@storybook/addons";
import { useEffect, useState } from "react";

/**
 * Go from search string to object with parsed numeric values
 */
export const decode = (search: string): object => {
  const params = new URLSearchParams(search);
  const numeric = Object.entries(params).map(([key, value]) => {
    const parsed = Number(value);
    return [key, isNaN(parsed) ? value : parsed];
  })
  return Object.fromEntries(numeric);
};

/**
 * Go from object to valid local URL
 */
export const encode = <T,>(params: T): string => {
  return new URLSearchParams(Object.entries(params)).toString();
};

type QueryParams = {
  items?: number;
  tag?: string;
  reference?: number;
  increment?: number;
};

type Fixtures = {
  query?: QueryParams;
  navigateWithQuery: Function;
  onIncrementValue: Function;
};

export default (search: string, defaults: QueryParams, navigate: Function): Fixtures => {

  /**
   * Save the parsed state.
   */
  const [query, setQuery] = useState<QueryParams>(defaults);

  /**
   * When page loads or search string changes parse the string to React state.
   * 
   * Determine visible content. 
   */
  useEffect(() => {
    if (search ?? false) setQuery({ ...defaults, ...decode(search) });
  }, [search]);

  const navigateWithQuery = useCallback((insert: QueryParams) => {
    const combine = encode({
      ...decode(search),
      ...insert
    });
    navigate(`/?${combine}`);
  }, [navigate, search]);

  const onIncrementValue = useCallback((key: string, increment: number) => {
    const current: any = decode(search);
    const value: string = current[key];
    const numeric: number = typeof value !== "undefined" ? parseInt(value) : increment;
    const combine = encode({
      ...current,
      [key]: numeric + increment
    });
    navigate(`/?${combine}`);
  }, [navigate, search]);


  return {
    query,
    navigateWithQuery,
    onIncrementValue
  }

}