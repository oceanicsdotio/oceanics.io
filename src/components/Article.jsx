import React from "react";
import { Link } from "gatsby";
import styled from "styled-components";
import { pink, grey, ghost } from "../palette";
import kebabCase from "lodash/kebabCase";


const StyledArticle = styled.article`

    & h2 {
        margin-bottom: 0;
        padding: 0;
    }

    & small {
        display: block;
        color: ${grey};
    }

    & a {
        display: inline-block;
        text-decoration: none;
        color: ${ghost};
        border: 1px solid;
        border-radius: 0.3rem;
        padding: 0.3rem;
        font-size: smaller;
        margin: 0;
        margin-right: 0.2rem;
    }

    & h2 > a {
        box-shadow: none;
        color: ${pink};
        text-decoration: none;
        border: none;
        margin: 0;
        padding: 0;
    }
`;

export default ({
    frontmatter: {
        title,
        date,
        description,
        tags
    }, fields: {
        slug
    }
}) =>
    <StyledArticle>
        <header>
            <h2>
                <Link to={slug}>{title}</Link>
            </h2>
            <small>{date}</small>
           
           
        </header>
        <section>
            <p>{description}</p>
        </section>
        {tags.map((text, ii) => 
                <Link 
                    key={`tags-${ii}`} 
                    to={`tags/${kebabCase(text)}`
                }>
                    {text}
                </Link>
            )}
    </StyledArticle>;