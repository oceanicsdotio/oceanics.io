import React from "react";
import GlobalStyle from "./GlobalStyle";

export interface ILayout {
    className?: string,
    title: string,
    HeadComponent: Element,
    description: string,
    children: JSX.Element,
}

/**
 * The NavBar is a <nav> element that displays links or buttons
 * as a horizontal bar with the current choice styled
 * prominently.
 * 
 * Internal links emphasized.
 */
const Layout = ({ 
    children,
    title,
    description,
    HeadComponent
}: ILayout) => {
    
    return <>
        <GlobalStyle />
        <HeadComponent>
            <title>{`${"Oceanics.io"} | ${title}`}</title>
            <meta name="description" content={description} />
         </HeadComponent>
        <nav>
            <a href={"/"}>{title}</a>  
        </nav>
        <main>
            {children}
        </main>
        <footer>
            We love you! Regardless of identity, ability, or belief. That being said, when you arrive we track your user agent, actions, and location. These data are never transmitted, but may be stored on your device. We manage risk with encryption and best security practices.
        </footer>
    </>
};
export default Layout