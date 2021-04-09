import React from "react";
import { Link } from "gatsby";
import styled from "styled-components";
import { pink } from "../palette";
import kebabCase from "lodash/kebabCase";



const StyledArticle = styled.article`

    & h2 {
        margin-bottom: 0;
    }

    & header a {

        display: inline-block;
        text-decoration: none;
        color: ${pink};
        border: 1px solid;
        border-radius: 0.3rem;
        margin: 0.2rem;
        padding: 0.3rem;
    }

    & h2 > a {
        box-shadow: none;
        text-decoration: none;
        border: none;
        margin: 0;
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
            {tags.map((text, ii) => 
                <Link 
                    key={`tags-${ii}`} 
                    to={`tags/${kebabCase(text)}`
                }>
                    {text}
                </Link>
            )}
            <p>{date}</p>
        </header>
        <section>
            <p>{description}</p>
           
        </section>
    </StyledArticle>;