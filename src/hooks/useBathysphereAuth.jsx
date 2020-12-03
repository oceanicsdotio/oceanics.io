import {useReducer}  from "react";
    
export default () => {

    const register = ({
        email, 
        password, 
        server, 
        apiKey,
        onLogin
    }) => {

        fetch(server+"/api/auth", {
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
            .then(onSuccess)
            .catch()
    };
    
    const [token, login] = useReducer((prev, {email, password, server}) => {
        
        let result;

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
            .then(token => {
                result = "token" in token ? token.token : "";
                if (onLogin) onLogin(result);
            }) 

        return result;

    }, "");

    return {token, login, register}

};
