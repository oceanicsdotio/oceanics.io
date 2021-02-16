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