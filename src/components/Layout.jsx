import React, { useMemo } from "react";
import styled from "styled-components";
import { Link } from "gatsby";

import { pink, ghost } from "../palette";
import { rhythm } from "../typography";
import layout from "../data/layout.yml";

import YAML from "yaml";

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
const SiteLink = styled.a`
    color: ${({color})=>color};
    font-size: x-large;
`;

/** 
 * Internal link, emphasized
 */
export const Title = styled(Link)`
    font-size: xx-large;
    color: ${ghost};
    margin: 0;
    padding: 0;
    margin-right: 1rem;
`;

    

export const Layout = ({ 
    children,
    className,
    title = null
}) => {

    /**
     * Memoize the top navigation links when they are created, 
     * to prevent re-rendering if layout changes. 
     */
    const links = useMemo(()=>{
        return layout.site.map(({label, to}, key) =>  
            <SiteLink 
                href={to} 
                color={pink}
                key={`site-link-${key}`}
                target={"_blank"}
            >
                {label}
            </SiteLink>
        )
    });


    const policy = useMemo(()=>{
        return YAML.parse(layout.footer.policy)
            .split("\n")
            .filter(paragraph => paragraph)
    });

    

    /**
     * Memoize footer links as well. 
     */
    const footerLinks = useMemo(()=>{
        return layout.footer.links.map(({label, to}, key) => 
            <Link 
                key={label} 
                to={to}
                color={ghost}
                key={`footer-link-${key}`}
            >
                {label}
            </Link>
        )
    });

    return <div className={className}>
        
        <NavBar>
            <Title to={"/"} color={ghost}>{title || layout.title}</Title>
            {links}
        </NavBar>

        <main>{children}</main>
        <footer>
            
            <p>{`${layout.footer.statement} 2018-${new Date().getFullYear()}`}</p>
            {policy.map((text, ii) => <p key={`text-${ii}`}>{text}</p>)}
        </footer>
    </div>
};

export const StyledLayout = styled(Layout)`
    margin-left: auto;
    margin-right: auto;
    max-width: ${({expand})=>expand?"100%":"65ch"};
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

    & footer {
        margin-top: 2rem;

        & a {
            color: ${ghost};
            display: block;
            font-size: large;
        }

        & p {
            font-size: smaller;
        }
    }
`;

export default StyledLayout;
