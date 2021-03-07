import React, { useReducer }  from "react";
import styled from "styled-components";
import { Link } from "gatsby";

import { pink, ghost, grey, blue } from "../palette";
import { rhythm } from "../typography";
import layout from "../data/layout.yml";


/**
 * The NavBar is a <nav> element that displays links or buttons
 * as a horizontal bar with the current choise styled
 * prominently.
 */
export const NavBar = styled.nav`

    display: block;
    justify-content: space-between;
    text-align: left;
    color: ${ghost};
    padding: 0.5rem;

    & > * {
        display: inline;
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

/**
 * Internal link
 */
const SiteLink = styled(Link)`
    color: ${({color})=>color};
`;


/** 
 * Internal link, emphasized
 */
export const Title = styled(SiteLink)`
    font-size: larger;
`;
    
/**
 * Internal link, de-emphasized
 */
const MinorLink = styled(SiteLink)`
    display: block;
`;

export const Layout = ({ 
    children,
    className,
    title = null
}) => {

    return <div className={className}>
        
        <NavBar>
            <Title to={"/"} color={ghost}>{title || layout.title}</Title>
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


        <main>{children}</main>
        <footer>
            <p>{"We work fearlessly to elevate operations and fuel a prosperous and accountable blue economy on behalf of future seas"}</p>
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
        border-radius: 1rem 1rem 0 0;
    }

    & > footer {
        margin-top: 2rem;
    }
`;

export default StyledLayout;
