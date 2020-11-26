import React, {useEffect, useState} from "react";
import {queryBathysphere} from "../bathysphere";
import styled from "styled-components";

const StyledEntry = styled.div`
    color: orange;
`;

export default ({edges, token, baseUrl}) => {

    const [state, setState] =  useState(null);

    useEffect(()=>{
        (async () => {
            const url = baseUrl + `codex?word=oyster&mutations=2`
            const lookUp = await queryBathysphere(url, ":" + token).then(x => {return x.json()});
            console.log(lookUp);
        })()
    },[])

    useEffect(()=>{

        let mapping = {};
        edges.forEach(({ node }) => {
            const {frontmatter: {tags, description}, fields: {slug}} = node;
    
            (description.split(" ") || []).concat(tags).forEach((word)=>{
    
                let parsed = word.trim().toLowerCase();
                const lastChar = word[word.length-1]
                if (lastChar === "." || lastChar === "," || lastChar === "?") {
                    parsed = word.slice(0,word.length-1);
                } 
                if (parsed.length < 3) return;  // "continue"
                
                if (parsed in mapping) {
                    mapping[parsed].links.push(slug);
                    mapping[parsed].count++;
                } else {
                    mapping[parsed] = {
                        count: 1,
                        links: [slug]
                    };
                }
            });
        });

        setState(mapping);

    },[]);

    const onClick = async (word) => {

        const url = baseUrl + `codex?word=${word}&mutations=1`
        const lookUp = await queryBathysphere(url, ":" + token).then(x => {return x.json()});
        console.log(lookUp.value);
       
    };
    
    return state?<>{Object.entries(state).map(([k, v]) => <StyledEntry onClick={async () => await onClick(k)}>{`${k} (${v.count})`}</StyledEntry>)}</>:null
};

