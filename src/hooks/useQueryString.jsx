import { useEffect, useState } from "react"; 

import { navigate } from "gatsby";


/**
 * Go from search string to object with parsed numeric values
 * 
 * @param {*} x 
 * @returns 
 */
export const decode = x => Object.fromEntries(x
    .slice(1, x.length)
    .split("&")
    .map(item => {

        const [key, value] = item.split("=");
        const parsed = Number(value);

        return value && !isNaN(parsed) ? [key, parsed] : [key, value]
    }));

/**
 * Go from object to valid local URL
 * @param {*} x 
 * @returns 
 */
export const encode = x => {
    return "/?" + Object.entries(x)
        .map(([key, value]) => `${key}=${value}`)
        .join("&")
};


/**
 * Set tag from value know in advance
 * 
 * @param {*} search 
 * @param {*} tag 
 * @returns 
 */
export const onSelectValue = (search, key, value=null) => (event) => {

    const params = search ? decode(search) : {};

    navigate(encode({
        ...params, 
        [key]: value ? value : event.target.value
    }));
};

/**
 * Set tag as current, and increase number visible
 */
export const onIncrementValue = (search, key, increment=1) => () => { 

    const params = search ? decode(search) : {[key]: undefined};

    const value = (typeof params[key] !== undefined && params[key]) ? 
        params[key] + increment : 2*increment;

    navigate(encode({
        ...params,
        [key]: value
    })); 
};


export default ({search, defaults}) => {

    /**
     * Save the parsed state.
     */
    const [ query, setQuery ] = useState(null); 

    /**
     * When page loads or search string changes parse the string to React state.
     * 
     * Determine visible content. 
     */
    useEffect(() => {
        if (search) setQuery({...defaults, ...decode(search)});
    }, [ search ]);

    return {
        query: query
    }
    
}