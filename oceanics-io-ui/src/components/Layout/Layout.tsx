/**
 * React and friends
 */
import React, { useMemo } from "react";

/**
 * Component level styling
 */
import styled from "styled-components";

/**
 * Color palette
 */
import { pink, ghost, orange } from "../palette";

/**
 * Typesetting
 */
import { rhythm } from "./typography";


/**
 * YAML parser
 */
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
export const Title = styled.a`
    font-size: 2.5em;
    color: ${orange};
    margin: 0;
    padding: 0;
`;

type LinkType = {
    label: string,
    href: string
}

type LayoutType = {
    children: any,
    className: string,
    title: string,
    site: LinkType[],
    footer: {
        policy: string
    },
    expand: boolean
}

    
export const Layout = ({ 
    children,
    className,
    title,
    site = [],
    footer: {
        policy="",
    },
}: LayoutType) => {

    /**
     * Memoize the top navigation links when they are created, 
     * to prevent re-rendering if layout changes. 
     */
    const links = useMemo(()=>{
        return site.map(({label, href}, key) =>  
            <SiteLink 
                href={href} 
                color={pink}
                key={`site-link-${key}`}
                target={"_blank"}
            >
                {label}
            </SiteLink>
        )
    }, []);


    const _policy = useMemo(()=>{
        return YAML.parse(policy)
            .split("\n")
            .filter((paragraph: string) => paragraph)
    }, []);

    return <div className={className}>
        
        <NavBar>
            <Title href={"/"}>{title}</Title>  
            {links}
        </NavBar>

        <main>{children}</main>
        <footer>
            {_policy.map((text: string, ii: number) => <p key={`text-${ii}`}>{text}</p>)}
        </footer>
    </div>
};

export const StyledLayout = styled(Layout)`
    margin-left: auto;
    margin-right: auto;
    max-width: ${({expand}: LayoutType)=>expand?"100%":"65ch"};
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
