import { rhythm } from "../typography";
import styled from "styled-components";
import { MDXProvider } from "@mdx-js/react";

import React, { useReducer }  from "react";
import { Link } from "gatsby";
import { pink, ghost, grey, blue } from "../palette";

// Shortcode components for MDX child rendering
import Lagrangian from "./Lagrangian";
import {StyledCaption} from "./Canvas";
import OceansideManual from "./OceansideManual";
import Rubric from "./Rubric";
import References, {Reference, Inline} from "./References";
import PDF from "./PDF";
import OpenApi from "./OpenApi";

import layout from "../../static/layout.yml";


const NavBar = styled.nav`

    display: block;
    justify-content: space-between;
    text-align: left;
    visibility: ${({hidden=false})=>hidden?"hidden":null};
    height: ${({hidden=false})=>hidden?"0":"auto"};
    color: ${ghost};

    & > * {
        display: inline-block;
        margin: 0.5rem;
        text-decoration: none;
        font-family: inherit;
        font-size: inherit;
        
    }

    & > button {
        color: ${pink};
        background: none;
        border: none;
        cursor: pointer;
    }
`;


const SiteLink = styled(Link)`
    color: ${({color})=>color};
`;

const Title = styled(SiteLink)`
    font-size: x-large;
`;
    
const MinorLink = styled(SiteLink)`
    display: block;
`;

const ExternalLink = styled.a`
    color: ${({ok=true})=>ok ? blue : grey};
`;

export const Layout = ({ 
    children,
    className,
    apiLabel = "APIs",
    title = "Oceanics.io"
}) => {

    const [hidden, showGutter] = useReducer(prev=>!prev, true);

    return <div className={className}>
        
        <NavBar>
            <Title to={"/"} color={ghost}>{title}</Title>
            <button onClick={showGutter}>
                {apiLabel}
            </button>
            {layout.site.map(({label, to, color=pink}, key) =>  
                <SiteLink 
                    to={to} 
                    color={color}
                    key={`site-link-${key}`}
                >
                    {label}
                </SiteLink>
            )}
        </NavBar>

        <NavBar hidden={hidden}>
            {layout.api.map(({label, href, ok}, key) => 
                <ExternalLink 
                    href={href} 
                    ok={ok}
                    key={`api-link-${key}`}
                >   
                    {label}
                </ExternalLink>
            )}
        </NavBar>

        <main>
            <MDXProvider components={{
                StyledCaption, 
                Lagrangian, 
                OceansideManual,
                Rubric,
                Reference,
                References,
                Inline,
                PDF,
                OpenApi
            }}>
                {children}
            </MDXProvider>
        </main>
        <footer>
            {layout.footer.map(({label, to}, key) => 
                <MinorLink 
                    key={label} 
                    to={to}
                    color={ghost}
                    key={`footer-link-${key}`}
                >
                    {label}
                </MinorLink>
            )}
        
            <p>
                {`Made with 🏴 in Maine`} <br/>
                {`No rights reserved, 2018-${new Date().getFullYear()}`}
            </p>
        </footer>
    </div>
};

export const StyledLayout = styled(Layout)`
    margin-left: auto;
    margin-right: auto;
    max-width: ${({expand})=>expand?"100%":rhythm(24)};
    padding: ${rhythm(1.5)} ${rhythm(0.75)};

    & > main {
        height: auto;
        bottom: 0;
        padding-top: 1rem;
        padding-bottom: 1rem;
        border-top: 0.1rem solid ${ghost};
        border-bottom: 0.1rem solid ${ghost};
        border-radius: 1rem;
    }

    & > footer {
        margin-top: 2rem;
    }
`;

export default StyledLayout;