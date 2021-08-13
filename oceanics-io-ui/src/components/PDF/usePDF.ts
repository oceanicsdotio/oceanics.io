/**
 * React and friends
 */
import {useEffect, useState, useRef} from 'react';

/**
 * PDF library from Mozilla
 */
import {getDocument, version, GlobalWorkerOptions} from 'pdfjs-dist';

/**
 * Text manipulation
 */
import {singular} from "pluralize";
import { PDFDocumentProxy, PDFPageProxy, TextContent, TextItem } from 'pdfjs-dist/types/src/display/api';

const REGEX_STRIP = /[^a-z\-\']/gmi;

GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.js`;

type DocumentType = {
    doc: any;
    scale: number;
    pageNumber: number;
}
type Accum = {
    words: string[];
    fragment: string;
}

const reduceAcrossLines = (acc: Accum, {str}: TextItem) => {
    const words = (acc.fragment + str).split(/\s+/g)
    const fragment = words.length ? words[-1] : "";
    return {
        words: [...acc.words, ...words], 
        fragment
    }
}

/**
 * PDF component loads a document and indexes a selected page.
 */
export default ({
    doc, 
    scale=1, 
    pageNumber=1
}: DocumentType) => {
    
    /**
     * Save source document to React state
     */
    const [pdf, setPdf] = useState<PDFDocumentProxy|null>(null);
    useEffect(() => {
        getDocument(doc).promise.then(setPdf);
    }, []);

    /**
     * Save the current page
     */
    const [page, setPage] = useState<PDFPageProxy|null>(null);
    useEffect(() => {
        if (pdf) pdf.getPage(pageNumber).then(setPage);
    }, [pdf]);

    /**
     * Render full page to primary HTML canvas element
     */
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(()=>{
        if (!page || !ref || !ref.current) return;
        const viewport = page.getViewport({ scale });
        const {width, height} = viewport;
        ref.current.height = height;
        ref.current.width = width;

        page.render({viewport, canvasContext: ref.current.getContext('2d') || {}});
    }, [page]);

    /**
     * Save content as text lines array, like streaming text APIs.
     */
    const [pageContent, setPageContent] = useState<TextContent|null>(null);
    useEffect(() => {
        if (page) page.getTextContent().then((pgc: TextContent) => {setPageContent(pgc)});
    }, [page]);

    const [stopWords, setStopWords] = useState<string[]>([]);

    useEffect(() => {
        setStopWords(new Set(await fetch('/stopwords.json')
        .then(r => r.json())))
    }, [])

    const [lexicon, setLexicon] = useState(null);
    useEffect(()=>{
        // Do something with page content
        if (!pageContent) return;

        const regExp = /[^a-z\-\']/gmi;
        let vocabularySize = 0;

        (async () => {

            

            setLexicon(Object.entries(
                pageContent.items
                .reduce(reduceAcrossLines, "").words
                .map(word => singular(word.toLowerCase().replace(REGEX_STRIP, "")))
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
    
    return {
        ref,
        lexicon
    }
}
