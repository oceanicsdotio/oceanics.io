import { createGlobalStyle } from "styled-components";

const GlobalStyle = createGlobalStyle`
    * {
        box-sizing: border-box;
    }

    img {
        width: 100%;
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


    .container {
        display: inline-flex;
        flex-direction: row;
        padding: 5px;
        outline: none;
        overflow-wrap: normal;
        text-align: center;
    }

    .container p {
        display: block;
        height: 100%;
        position: absolute;
        z-index: 10;
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