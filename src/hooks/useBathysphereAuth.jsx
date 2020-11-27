import {useReducer}  from "react";
    
export default ({
    apiKey = 'FL_fnXrKrRG1ae3VLpn2oAgeVZrVUn5kXJyTFDQ_1GlpC_xzXYJnU6SDz5stoS4wlts-t9qXljblUJzgK3FcIw'
}) => {

    const register = ({email, password, server}) => () => {

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
            .then(data => {
                console.log(data);
            })
    };
    
    const [token, login]  = useReducer((prev, {email, password}) => {
        
        let _token = prev;

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
                if (!("token" in token)) {
                    console.log("Error authorizing", token);
                } else {
                    _token = token.token;
                }  
            }) 

        return _token;

    }, null);

    return {token, login, register}

};
