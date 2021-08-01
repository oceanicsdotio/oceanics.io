import React, {useEffect, useState, useRef} from 'react';
import {getDocument, version, GlobalWorkerOptions, OPS} from 'pdfjs-dist';
import styled from "styled-components";
import {singular} from "pluralize";

GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.js`;

const StyledCanvas = styled.canvas`
    width: 100%;
`;


/**
 * PDF component loads a document and indexes a selected page.
 */
export default ({
    doc, 
    scale=1, 
    pageNumber=1
}) => {
    
    const [pdf, setPdf] = useState(null);
    useEffect(()=>{
        // Save source document to React state
        getDocument(doc).promise.then((pdfData) => {setPdf(pdfData)});
    },[]);

    const [page, setPage] = useState(null);
    useEffect(()=>{
        // Save current page
        if (pdf) pdf.getPage(pageNumber).then(pg => {setPage(pg)});
    },[pdf]);

    const ref = useRef(null);
    useEffect(()=>{
        // Render full page to primary HTML canvas element
        if (!page || !ref.current) return;
        const viewport = page.getViewport({ scale });
        const {width, height} = viewport;
        ref.current.height = height;
        ref.current.width = width;

        page.render({viewport, canvasContext: ref.current.getContext('2d')});
    },[page]);

    const [pageContent, setPageContent] = useState(null);
    useEffect(()=>{
        // Save content as text lines array, like streaming text APIs.
        if (page) page.getTextContent().then(pgc => {setPageContent(pgc)});
    },[page]);

    const [lexicon, setLexicon] = useState(null);
    useEffect(()=>{
        // Do something with page content
        if (!pageContent) return;

        const regExp = /[^a-z\-\']/gmi;
        let vocabularySize = 0;

        (async () => {

            const stopWords = new Set(await fetch('/stopwords.json')
                .then(r => r.json()));

            setLexicon(Object.entries(
                pageContent.items
                .reduce((a, b) => a + b.str, "")
                .split(/\s+/g)
                .map(word => word.toLowerCase())
                .map(word => word.replace(regExp, ""))
                .map(word => singular(word))
                .filter(word => word && !stopWords.has(word))
                .reduce((a, word) => {       
                    vocabularySize += 1;    
                    if (word in a) a[word] += 1;
                    else a[word] = 1;
                    return a;
                }, {})
            ).sort(
                (a, b) => a[1] < b[1]
            ));

            console.log(vocabularySize);
        })();
    },[pageContent]);

    useEffect(()=>{
        // Show top 10 most frequent words
        if (!lexicon) return;
        console.log(lexicon.slice(0,10));
        console.log(GlobalWorkerOptions.workerSrc);
    },[lexicon]);
        
    /**
    Index the draw operations by type, to be able to reference image data!

    Swap Op and Code to reverse the lookup table. Then reduce singleton objects
    to object with an array value for each key. 
    */
    const [opRefs, setOpRefs] = useState(null);
    useEffect(()=>{
       
        if (!page) return;
         
        page.getOperatorList().then((ops) => {
            const reversedOPS = Object.fromEntries(Object.entries(OPS).map(([op, code])=>[code, op]));
            setOpRefs(
                ops.fnArray
                    .map(
                        (fnCode, index) => 
                            Object.fromEntries([[reversedOPS[fnCode], ops.argsArray[index]]]))
                    .reduce(
                        (a, b) => {
                            Object.entries(b).forEach(([key, value])=>{
                                if (key in a) a[key].push(value);
                                else a[key] = [value];
                            })
                            return a;
                        }, {}
                    )
            );            
        });
    },[page]);

    return <StyledCanvas ref={ref} hidden={false}/>;
}
