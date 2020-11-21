import React, {useReducer, useState, useEffect}  from "react";
import styled from "styled-components";
import Form from "./Form";
import {pink, ghost, shadow} from "../palette";


const StyledParagraph = styled.p`
    position: relative;
    width: 100%;
    font-size: smaller;
    margin-top: 10px;
`;

const StyledButton = styled.button`
    color: ${pink};
    text-decoration: none;
    border: none;
    font-family: inherit;
    font-size: inherit;
    background: none;
`;

const Dialog = ({content, form, className, hidden, callback}) => {
    return <div className={className} hidden={hidden}>     
        <Form 
            id={"login-dialog"} 
            callback={callback}
            {...form}
        />
        <StyledParagraph>
            {content}
        </StyledParagraph>
    </div>
};

const StyledLogin = styled(Dialog)`
    position: fixed;
    background: black;
    border: solid 1px;
    color: ${ghost};
    width: auto;
    max-width: 25%;
    height: auto;
    max-height: 75%;
    padding: 1%;
    top: 50%;
    left: 50%;
    margin-right: -50%;
    z-index: 10;
    transform: translate(-50%, -50%);
    overflow-y: scroll;
    overflow-x: hidden;
    text-align: left;
    visibility: ${({hidden})=>hidden?"hidden":null};
`;

    
export default ({
    onSuccess = null,
    baseUrl = "https://graph.oceanics.io/api/"
}) => {
    /*
    The login container is a fixed/hidden overlay element
    that handles authorization interactions with the
    backend.

    Available interface depends on whether user is registering
    or returning.
    */

    const [formData, updateFormData] = useReducer(
        (prev, event=null) => {
            return event ? {
                ...prev,
                [event.target.id]: event.target.value.trim()
            } : prev
        },
        {
            email: "",
            password: ""
        }
    );

    // Toggle between registering and logging in
    const [newUser, toggleNewUser] = useReducer(prev => !prev, false);
    const [hidden, toggleHidden] = useReducer(prev => !prev, true);
    const [accessToken, setToken] = useState(null);

    const [buttonContent, setButtonContent] = useState({
        content: "Login",
        callback: ()=>{toggleHidden()}
    });

    useEffect(()=>{
        setButtonContent({
            content: hidden ? (   
                accessToken ? 
                "Logout" : (
                    newUser ?
                    "Register" :
                    "Login"
                )
            ) : "Close",
            callback: accessToken && hidden ? 
                ()=>{
                    setToken(null);
                    if (onSuccess) onSuccess(null);
                } : 
                ()=>{toggleHidden()}
        });
    },[hidden, accessToken]);


    const register = () => () => {

        fetch(baseUrl+"auth", {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key':'FL_fnXrKrRG1ae3VLpn2oAgeVZrVUn5kXJyTFDQ_1GlpC_xzXYJnU6SDz5stoS4wlts-t9qXljblUJzgK3FcIw'
            },
            body: JSON.stringify({
                username: formData.email,
                password: formData.password
            })
        })
            .then(response => response.json())
            .then(data => {
                console.log(data);
            })
    };

    const login = () => {
        fetch(baseUrl+"auth", {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache',
            headers: {
                'Content-Type': 'application/json',
                'authorization': `${formData.email}:${formData.password}`
            }
        })
            .then(response => response.json())
            .then(token => {
                if (!("token" in token)) {
                    console.log("Error authorizing", token);
                } else {
                    toggleHidden();
                    setToken(token.token);
                    if (onSuccess) onSuccess(token.token);
                }  
            })  
    };

    const fields = [{
        type: "email", 
        id: "email", 
        placeholder: "name@example.com", 
        required: true,
    }, {
        type:"password", 
        id: "password",
        placeholder: "************", 
        required: true
    }];

    const config = {
        login: {
            form: {
                fields: fields,
                actions: [{
                    value: "Discover data",
                    onClick: login
                }, {
                    value: "Register instead",
                    onClick: () => toggleNewUser(),
                    destructive: "true"
                }]
            },
            content: "Authorize application on localhost. No data are sent to us. "
        },
        register: {
            form: {
                fields: fields,
                actions: [{
                    value: "Create account",
                    onClick: register()
                }, {
                    value: "Login instead",
                    onClick: () => toggleNewUser(),
                    destructive: "true"
                }]
            },
            content: "Create a new account in your local database. We receive a notification with your contact information."
        }
    }
   
    return <>
        <StyledButton onClick={buttonContent.callback}>
            {buttonContent.content}
        </StyledButton>
        <StyledLogin 
            hidden={hidden}
            callback={updateFormData} 
            {...(newUser ? config.register : config.login)}
        />
    </>
};

