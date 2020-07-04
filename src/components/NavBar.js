import React, {useState}  from "react"
import { Link, navigate } from "gatsby"
import styled from "styled-components"
import Form from "../components/Form"
import {queryBathysphere} from "../utils/bathysphere";


const StyledListItem = styled.li`
    display: inline-block;
    margin-right: 1rem;
`;

const StyledLogin = styled.div`
    position: fixed;
    background: black;
    border: solid 1px;
    color: #CCCCCC;
    border-radius: 5px;
    width: auto;
    height: auto;
    max-height: 75%;
    padding: 3%;
    top: 50%;
    left: 50%;
    margin-right: -50%;
    transform: translate(-50%, -50%);
    overflow: scroll;
    text-align: left;
`;

const StyledButtonActive = styled.button`
    background: #101010;
    border: solid 1px;
    border-radius: 5px;
    color: #77CCFF;
    text-decoration: none;
`;

const StyledButton = styled.button`
    background: #101010;
    border: solid 1px;
    border-radius: 5px;
    color: #EF5FA1;
    text-decoration: none;
`;

const StyledNavBar = styled.nav`
    display: block;
    width: 100%;
    justify-content: space-between;
    text-align: right;
    background: none;
    margin-bottom: 1.45rem;
`;

const cultureMethods = ["Bottom", "Rope (Horizontal)", "Rope (Vertical)", "Ear hang (Scallop)", "Midwater (Cage/Basket)"];
const cultureSpecies = ["Oysters", "Scallops", "Mussels", "Macroalgae", "Finfish"];
const stages = ['Prospecting', "Applying", "Operating", "Renewing", "Expanding"];
const reason = ["Shellfish sanitation", "Lease hearing", "Lawsuit", "Exploring"];

const ListLink = ({external=false, children, key, ...props}) => {
    return (
        <StyledListItem key={key}>
            {external ? <a {...props}>{children}</a> : <Link {...props}>{children}</Link>}
        </StyledListItem>
    )
};


export const StatefulButton = ({text, active=false, onClick, altText}) => {
    const displayText = active ? altText : text;
    return active ? 
        <StyledButtonActive onClick={onClick}>{displayText}</StyledButtonActive> : 
        <StyledButton onClick={onClick}>{displayText}</StyledButton>
};

const LoginContainer = (props) => {

    const {callbacks} = props;
    const [register, setRegister] = useState(false);
    
    const fields = [
        {inputType:"email", id: "e-mail", name: "e-mail", placeholder: "name@example.com", required: true},
        {inputType:"password", id: "password", name: "password", placeholder: "************", required: true},
    ];

    const regFields = [
        {id: "name", name: "person", placeholder: "Person to contact", required: true},
        {id: "company", placeholder: "Legal entity", required: true},
        {id: "lease", placeholder: "Maine lease/license code"},
        {id: "website", placeholder: "URL for company or lease PDF"},
        {id: "location", placeholder: "43.998178, -69.54253"},
        {id: "species", options: cultureSpecies},
        {id: "method", options: cultureMethods},
        {id: "stage",  options: stages},
        {id: "urgency", options: reason, required: true},
        {id: "details", placeholder: "Provide as much detail as you can about your desired growing area", long: true, required: true},
    ];

    const loginAction = {
        value: "Discover data",
        onClick: callbacks.login
    };

    const registerAction = {
        value: "Create new account",
        onClick: callbacks.login
    };

    const actions = [{
        id: "submit",
        ...(register ? registerAction : loginAction)
    }];

    return (
        <StyledLogin>
            
            <StatefulButton 
                text={"Login"} 
                altText={"Register"} 
                active={register} 
                onClick={() => setRegister(!register)}
            />
            <hr/>
            <Form {...{
                id: "login-form",
                fields: [...fields, ...(register ? regFields : [])],
                actions,
            }}/>
        </StyledLogin>
    )
};


export default (props) => {

    const [dialog, setDialog] = useState(false);
    let accessToken = localStorage.getItem("accessToken");

    const baseUrl = "http://localhost:5000/api/";
    const auth = "bathysphere@oceanics.io:n0t_passw0rd";
    let itemIndex = 0;
   
    return (
        <StyledNavBar>
            <ul>
            <ListLink key={itemIndex++} href="https://graph.oceanics.io" external={true}>Bathysphere API</ListLink>
            <ListLink key={itemIndex++} to="/tags">Tags</ListLink>

            {accessToken ?
                (<>
                    <ListLink key={itemIndex++} to="/catalog">Console</ListLink>
                </>) : null
            }

            <StatefulButton 
                onClick={async () => {
                    if (accessToken) {
                        accessToken = null;
                        localStorage.removeItem("accessToken");
                        navigate(`/`);
                    } else {
                        setDialog(!accessToken && !dialog);
                    }
                        
                }} 
                active={dialog} 
                text={accessToken ? "Logout" : "Login"} 
                altText={"Close"} 
            />

            {dialog && !accessToken ? 
                <LoginContainer 
                    callbacks={{login: async () => {
                        const token = await queryBathysphere(baseUrl + "auth", auth).then(x => {return x.json()});
                        if (!("token" in token)) {
                            console.log("Error authorizing", token);
                        } else {
                            console.log("Successfully retrieved token", token.token);
                            localStorage.setItem("accessToken", token.token);
                            accessToken = token.token;
                            setDialog(false);
                            navigate(`/catalog/`);
                        }  
                    }}}
                /> : null
            }

            </ul>
        </StyledNavBar>
    )
}
