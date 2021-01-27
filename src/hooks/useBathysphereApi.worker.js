
/**
 * Create a new account
 * @param {} param0 
 */
export const register = async ({
    email, 
    password, 
    server, 
    apiKey
}) => {

    return fetch(server+"/api/auth", {
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
        .then(response => response.json())
};

/**
 * Get the index
 * @param {*} param0 
 */
export const query = async ({url, accessToken}) => {
    return fetch(url, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
            'Content-Type': 'application/json',
            'authorization': `:${accessToken}`
        }
    })
        .then(response => response.json())
        .then(data => data.value);
};


/**
 * Login and get a JWT
 * @param {*} param0 
 */
export const login = async ({email, password, server}) => {

    return fetch(server+"/api/auth", {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
            'Content-Type': 'application/json',
            'authorization': `${email}:${password}`
        }
    })
        .then(response => response.json())
        .then(token => "token" in token ? token.token : "")
};

