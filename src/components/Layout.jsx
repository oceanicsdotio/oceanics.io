import React, { useMemo } from "react";
import styled from "styled-components";
import { Link } from "gatsby";

import { pink, ghost } from "../palette";
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
    margin-bottom: 0.5rem;
    padding: 0;

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
    font-size: x-large;
`;


/** 
 * Internal link, emphasized
 */
export const Title = styled(SiteLink)`
    font-size: xx-large;
    margin: 0;
    padding: 0;
    margin-right: 1rem;
`;
    
/**
 * Internal link, de-emphasized
 */
const MinorLink = styled(SiteLink)`
    display: block;
    font-size: large;
`;

export const Layout = ({ 
    children,
    className,
    title = null
}) => {

    const links = useMemo(()=>{
        return layout.site.map(({label, to, color=pink}, key) =>  
            <SiteLink 
                to={to} 
                color={color}
                key={`site-link-${key}`}
            >
                {label}
            </SiteLink>
        )
    });

    const footerLinks = useMemo(()=>{
        return layout.footer.map(({label, to}, key) => 
            <MinorLink 
                key={label} 
                to={to}
                color={ghost}
                key={`footer-link-${key}`}
            >
                {label}
            </MinorLink>
        )
    });

    return <div className={className}>
        
        <NavBar>
            <Title to={"/"} color={ghost}>{title || layout.title}</Title>
            {links}
        </NavBar>


        <main>{children}</main>
        <footer>
            <p>{"We fearlessly pursue accountable blue prosperity and operational excellence on behalf of future seas"}</p>
            {footerLinks}
            <p> 
                {`Made with 🏴 in Maine 2018-${new Date().getFullYear()}`}  <br/>
                {`No rights reserved`}
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
        border-top: none;
        border-bottom: 0.1rem solid ${ghost};
        border-radius: 1rem 1rem 0 0;
    }

    & > footer {
        margin-top: 2rem;
    }
`;

export default StyledLayout;
