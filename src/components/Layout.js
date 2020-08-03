
import { rhythm } from "../typography";
import styled from "styled-components";

import React, {useState, useEffect}  from "react"
import { Link, navigate } from "gatsby"
import Form from "../components/Form"
import {queryBathysphere} from "../bathysphere";

const StyledLayout = styled.div`
    margin-left: auto;
    margin-right: auto;
    max-width: ${rhythm(24)};
    padding: ${rhythm(1.5)} ${rhythm(0.75)};
`;

const StyledListItem = styled.li`
    display: inline-block;
    margin-right: 1rem;
`;

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
    color: #CCCCCC;
    border-radius: 5px;
    width: auto;
    max-width: 25%;
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

const StyledButton = styled.button`
    height: auto;
    background: #101010;
    border: solid 1px;
    margin-right: 5px;
    border-radius: 5px 5px 0px 0px;
    color: ${props => props.active ? "#77CCFF" : "#EF5FA1"};
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

const StyledHeaderDiv = styled.div`
    margin: 0 auto;
    max-width: 960;
    padding: 1.45rem 1.0875rem;
`;

const StyledHeader = styled.header`
    background: none;
    margin-bottom: 0;
`;

const StyledSiteTitle = styled.h1`
    margin: 0;
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
    return <StyledButton onClick={onClick} active={active}>{active ? altText : text}</StyledButton>
};


const LoginContainer = ({callbacks}) => {

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

            <StyledParagraph>{
                register ? 
                "Create a new account in your local database. We receive a notification with your contact information." : 
                "Authorize application on localhost. No data are sent to us."
            }</StyledParagraph>
            
            <Form {...{
                id: "login-form",
                fields: [...fields, ...(register ? regFields : [])],
                actions,
            }}/>
        </StyledLogin>
    )
};


export default ({ children }) => {

    const [dialog, setDialog] = useState(false);
    const [accessToken, setAccessToken] = useState(null);

    const baseUrl = "http://localhost:5000/api/";
    const auth = "bathysphere@oceanics.io:n0t_passw0rd";
    let itemIndex = 0;
  

    useEffect(()=>{
        setAccessToken(localStorage.getItem("accessToken"));
    },[]);

    const setRestriction = async () => {
        if (accessToken) {
            setAccessToken(null);
            localStorage.removeItem("accessToken");
            navigate(`/`);
        } else {
            setDialog(!accessToken && !dialog);
        }       
    };

    const login = async () => {
        const token = await queryBathysphere(baseUrl + "auth", auth).then(x => x.json());
        if (!("token" in token)) {
            console.log("Error authorizing", token);
        } else {
            console.log("Successfully retrieved token", token.token);
            localStorage.setItem("accessToken", token.token);
            setAccessToken(token.token);
            setDialog(false);
            navigate(`/catalog/`);
        }  
    };

    return (
        <StyledLayout>
              <StyledHeader>
                <StyledHeaderDiv>
                    <StyledSiteTitle>
                        <Link
                            to="/"
                            style={{
                                boxShadow: `none`,
                                color: `inherit`
                            }}
                            >
                            {"Oceanicsdotio"}
                        </Link>
                    </StyledSiteTitle>
                </StyledHeaderDiv>
            </StyledHeader>
            <StyledNavBar>
                <ul>
                    <ListLink key={itemIndex++} to="/tags">Tags</ListLink>
                    <ListLink key={itemIndex++} href="https://graph.oceanics.io" external={true}>API</ListLink>
                    <ListLink key={itemIndex++} to="/legal">Legal</ListLink>
                    {accessToken ? <ListLink key={itemIndex++} to="/catalog/"><img src="/boat.gif"/></ListLink> : null}
                
                    <StatefulButton 
                        key={itemIndex++}
                        onClick={setRestriction} 
                        active={dialog} 
                        text={accessToken ? "Logout" : "Login"} 
                        altText={"Close"} 
                    />
                </ul>
                {dialog && !accessToken ? <LoginContainer callbacks={{login}}/> : null}
            </StyledNavBar>
            <main>{children}</main>
            <footer>
                <hr/>
                <p>Copyleft 2018-{new Date().getFullYear()}. No rights reserved.</p>
            </footer>
        </StyledLayout>
    )
};