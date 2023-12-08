import { createGlobalStyle } from "styled-components";
import Typography from "typography";
import { ghost, orange } from "../../palette";
const {rhythm} = new Typography({});

const GlobalStyle = createGlobalStyle`


    margin-left: auto;
    margin-right: auto;
    max-width: 65ch;
    padding: ${rhythm(1.5)} ${rhythm(0.75)};

    * {
        box-sizing: border-box;
    }

    body, html{
        background: #000000;
        font-size: large;
        font-family: monospace;
        color: ${ghost};
        margin: 0;
        position: absolute;
        padding: 0;
        width: 100%;
        height: 100%;
        overflow-x: hidden;
    }

    & nav {
        display: block;
        justify-content: space-between;
        text-align: left;
        color: ${ghost};
        margin-bottom: 0.5rem;
        padding: 0;

        & a {
            font-size: 2.5em;
            color: ${orange};
            margin: 0;
            padding: 0;
            display: inline;
            text-decoration: none;
            font-family: inherit;
        }
    }

    & footer {
        margin-top: 2rem;
        & p {
            font-size: smaller;
        }
    }

    & main {
        height: auto;
        bottom: 0;
        padding-top: 1rem;
        padding-bottom: 1rem;
        border-top: none;
        border-bottom: 0.1rem solid ${ghost};
        border-radius: 1rem 1rem 0 0;
    }

    body, html{
        background: #000000;
        font-size: large;
        font-family: monospace;
        color: #CCCCCC;
        margin: 0;
        position: absolute;
        padding: 0;
        width: 100%;
        height: 100%;
        overflow-x: hidden;
    }

    .map-popup {
        background: #202020FF;
        height: fit-content;
        border: solid 0.1rem;
        border-radius: 0.3rem;
        font-family:inherit;
        font-size: inherit;
        padding: 0;
        color: #CCCCCC;
    }

    .map-popup div {
        background: none;
        height: fit-content;
        border: none;
        margin: 0;
        padding: 0;
        float: left;
    }
`;

export default GlobalStyle;