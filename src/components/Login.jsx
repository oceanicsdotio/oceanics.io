import React, {useReducer}  from "react";
import styled from "styled-components";
import Form from "./Form";
import {pink, ghost} from "../palette";
import onboarding from "../../static/onboarding.yml";

const StyledParagraph = styled.p`
    position: relative;
    width: 100%;
    font-size: smaller;
    margin-top: 10px;
`;

const StyledLogin = styled.div`
    position: fixed;
    background: black;
    border: solid 1px;
    color: ${ghost};
    width: auto;
    max-width: 25%;
    height: auto;
    max-height: 75%;
    padding: 0;
    top: 50%;
    left: 50%;
    margin-right: -50%;
    transform: translate(-50%, -50%);
    overflow-y: scroll;
    overflow-x: hidden;
    text-align: left;
    visibility: ${({hidden})=>hidden?"hidden":null};
`;

const StyledButton = styled.button`
    height: auto;
    background: #101010;
    border: solid 1px;
    margin-right: 5px;
    border-radius: 5px 5px 0px 0px;
    color: ${pink};
    text-decoration: none;
`;

const fields = [{
    inputType: "email", 
    id: "e-mail", 
    name: "e-mail", 
    placeholder: "name@example.com", 
    required: true
}, {
    inputType:"password", 
    id: "password", 
    name: "password", 
    placeholder: "************", 
    required: true
}];

const Register = ({toggleNewUser, callback}) => {
    /*
    Registering creates a new account.
    */

    const regFields = [...fields, ...onboarding.fields];

    return (
        <>
        <StyledButton onClick={() => toggleNewUser()}>
            {"Register"}
        </StyledButton>
            
        <StyledParagraph>
            {"Create a new account in your local database. We receive a notification with your contact information."}
        </StyledParagraph>
        
        <Form 
            id={"login-form"}
            fields={regFields}
            actions={[{
                value: "Create account",
                onClick: callback
            }]}
        />
        </>
    )
};

const Login = ({
    toggleNewUser, 
    login
}) => {
    /*
    Login interface allows users with existing accounts to
    get a JavaScript Web Token (JWT)
    */
    return <>
        <StyledButton onClick={() => toggleNewUser()}>
            {"Login"}
        </StyledButton>
            
        <StyledParagraph>
            {"Authorize application on localhost. No data are sent to us."}
        </StyledParagraph>
        
        <Form 
            id={"login-form"}
            fields={fields}
            actions={[{
                value: "Discover data",
                onClick: login
            }]}
        />
    </> 
};

export default ({
    callback = null,
    baseUrl = "http://localhost:5000/api/"
}) => {
    /*
    The login container is a fixed/hidden overlay element
    that handles authorization interactions with the
    backend.

    Available interface depends on whether user is registering
    or returning.

    States:
    - authenticated
    - register
    - login
    - hidden
    */

    const toggle = (initial) => useReducer((prev, state=null) => {
        return state !== null ? state : !prev;
    }, initial);

    // Toggle between registering and logging in
    const [newUser, toggleNewUser] = toggle(true);
    const [hidden, toggleHidden] = toggle(true);

    const login = async () => {
        const token = await queryBathysphere(baseUrl + "auth", auth)
            .then(x => x.json());
        if (!("token" in token)) {
            console.log("Error authorizing", token);
        } else {
            console.log(`Successfully retrieved token: ${token.token}`);
            localStorage.setItem("accessToken", token.token);
            setAccessToken(token.token);
            setDialog(false);
        }  
    };

    
    // const [accessToken, setRestriction] = useReducer(
    //     async (token, update=null)=>{
    //         if (token && update) {
    //             localStorage.removeItem("accessToken");
    //             return null;
    //         } else if (token) {

    //         } else {
    //             setDialog(!accessToken && !dialog);
    //             return token
    //         }    
    //     }, 
    //     localStorage.getItem("accessToken")
    // );
       
    return <>
        <StyledButton onClick={() => toggleHidden()}>
            {hidden ? (newUser ? "Login" : "Logout") : "Close"}
        </StyledButton>
        
        <StyledLogin hidden={hidden}>
            {
                newUser ? 
                <Register {...{toggleNewUser}}/> : 
                <Login {...{toggleNewUser, login}}/>
            }
        </StyledLogin>
    </>
};

