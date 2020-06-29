export const queryBathysphere = async (uri, auth) => {

    return fetch(uri, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': auth
        }
    });
};

