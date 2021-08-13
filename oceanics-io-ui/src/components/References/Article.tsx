/**
 * React and friends
 */
import React, {FC, MouseEventHandler} from "react";

/**
 * Stylish stuff
 */
import styled from "styled-components";

/**
 * Predefined color palette
 */
import { charcoal, orange, grey, ghost, shadow } from "../../palette";
import { ArticleBaseType } from "./utils";



export type ArticleType = ArticleBaseType & {
    className?: string;
    index: number;
    search: string;
    onSelectValue: (arg0: string, arg1: string, arg2: string) => MouseEventHandler;
}

export const Article: FC<ArticleType> = ({
    className,
    frontmatter: {
        title,
        date,
        description,
        tags
    },
    fields: {
        slug
    },
    index,
    search,
    onSelectValue
}) => {
    return <div className={className}>
        <article>
        <header>
            <h2>
                <a href={slug}>{title}</a>
            </h2>
            <small>{date}</small>
        </header>
        <section>
            <p>{description}</p>
        </section>
        {tags.map((tag: string) =>
            <a key={`node-${index}-${tag}`} onClick={onSelectValue(search, "tag", tag)}>
                {tag}
            </a>
        )}
    </article>
    </div>
}


const StyledArticle = styled(Article)`

    & section {
        & p {
            font-size: larger;
        }
    }

    & h2 {
        margin-bottom: 0;
        padding: 0;
    }

    & small {
        display: block;
        color: ${ghost};
    }

    & a {
        display: inline-block;
        text-decoration: none;
        color: ${ghost};
        border: 1px dashed ${grey};
        background-color: ${charcoal};
        border-radius: 5px;
        font-size: smaller;
        margin-right: 5px;
        padding: 2px;
        cursor: pointer;
    }

    & h2 {
        & a {
            box-shadow: none;
            background-color: ${shadow};
            color: ${orange};
            border: none;
            font-size: inherit;
            text-decoration: underline;
            margin: 0;
            padding: 0;
        }
    } 
    
`;

export default StyledArticle