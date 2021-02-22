/**
 * Create a new account.
 * @param {} param0 
 */
export const register = async ({
    email, 
    password, 
    apiKey,
    server
}) => 
    fetch(`${server}/api/auth`, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': apiKey
        },
        body: JSON.stringify({
            username: email,
            password
        })
    })
        .then(response => response.json());


/**
 * Get the index.
 * @param {*} param0 
 */
export const query = async ({
    accessToken,
    server,
    route=""
}) => 
    fetch(`${server}/api/${route}`, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `:${accessToken}`
        }
    })
        .then(response => response.json())
        .then(data => data.value);


/**
 * Login and get a JWT.
 * @param {*} param0 
 */
export const login = async ({
    email, 
    password, 
    server
}) => 
    fetch(server+"/api/auth", {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
            'Content-Type': 'application/json',
            'authorization': `${email}:${password}`
        }
    })
        .then(response => response.json())
        .then(token => "token" in token ? token.token : "");


/**
 * Convenience method to make the name usable as a page anchor
 */ 
const transformName = name => name.toLowerCase().split(" ").join("-"); 



function partition(arr, low, high, col) {
    /*
    In place sorting function. 
    */
    let ii = low - 1;
    let temp;
    const pivot = arr[high];

    for (let jj = low; jj < high; jj++) {
        if (arr[jj][col] <= pivot[col]) {
            ii++;
            temp = arr[jj];
            arr[jj] = arr[ii];
            arr[ii] = temp;
        }
    }
    temp = arr[ii + 1];
    arr[ii + 1] = arr[high];
    arr[high] = temp;
    return ii + 1;
}

export function quickSort(arr, low, high, col) {
    /*
    simple implementation of the QuickSort algorithm.

    Generally the standard library should be used, but sometimes that does quite work.
    */
    if (low < high) {

        let index = partition(arr, low, high, col);

        quickSort(arr, low, index - 1, col);
        quickSort(arr, index + 1, high, col);
    }
};

export const locationHash = async (name) => "#" + transformName(name);

/** 
 * Generate derived fields, and match metadata to asset files.
 * Memoize the results to prevent recalculating when the parent
 * page re-renders.
 */
export const sorted = async ({tiles, icons}) => {

    const lookup = Object.fromEntries(
        icons.map(({relativePath, publicURL})=>[relativePath, publicURL])
    );
    
    
    return tiles.map(({name, becomes=[], data, ...x})=>Object({
            canonical: transformName(name), 
            group: (becomes || [])
                .map(x => 
                    tiles.filter(({name})=>transformName(name) === transformName(x)).pop()
                ).map(({name}) => ({
                    link: `#${transformName(name)}`,
                    text: name
                })), 
            name,
            publicURL: lookup[data],
            ...x
        }))
    .sort((a, b) => {
        [a, b] = [a, b].map(({canonical}) => canonical);
        if (a < b) return -1;
        if (a > b) return 1;
        return 0;
    });
}


/**
 * Find similar symbolic patterns, for word matching usually.
 * 
 * @param {*} param0 
 */
export const codex = async ({edges, accessToken, server}) => {

    let mapping = {};
     
    const lookUp = await query({route: `codex?word=oyster&mutations=2`, accessToken, server})

    edges.forEach(({ node }) => {
        const {frontmatter: {tags, description}, fields: {slug}} = node;

        (description.split(" ") || []).concat(tags).forEach((word)=>{

            let parsed = word.trim().toLowerCase();
            const lastChar = word[word.length-1]
            if (lastChar === "." || lastChar === "," || lastChar === "?") {
                parsed = word.slice(0,word.length-1);
            } 
            if (parsed.length < 3) return;  // "continue"
            
            if (parsed in mapping) {
                mapping[parsed].links.push(slug);
                mapping[parsed].count++;
            } else {
                mapping[parsed] = {
                    count: 1,
                    links: [slug]
                };
            }
        });
    });

    return mapping;

};


    