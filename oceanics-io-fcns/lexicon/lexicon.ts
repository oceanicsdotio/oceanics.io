import type {Handler} from "@netlify/functions"
import {readFileSync, writeFileSync} from "fs";


interface RowAccumulation {
    previous: number;
    word: string;
    symbol: string;
}

const calculateRow = ({previous, word, symbol}: RowAccumulation) => {

    const row = [previous[0] + 1];
    for (let jj = 1; jj < word.length + 1; jj++) {
        row.push(Math.min(
            row[jj-1] + 1, // insert, 
            previous[jj] + 1, // delete, 
            previous[jj-1] + Number(word[jj-1] !== symbol) // replace
        ));
    }
    return row;
}

const WELL_KNOWN_TEXT = readFileSync("functions/lexicon/words.txt")
    .toString()
    .split("\n");

/**
 * Simple iterative search loops through all words and preserves
 * a record of those which satisfy the maximum mutations
 * 
 * Calculates the similarity of two patterns, usually words
 * for the purpose of auto-correct or spell checking
 * 
 * @param {*} param0 
 */
const search = ({
    words, 
    pattern, 
    maxCost,
}) => 
    words.reduce((result, word) => { 
        const cost = [...word].reduce((row, symbol) =>
            calculateRow({
                previous: row, 
                word: pattern, 
                symbol
            }), 
            Array(Array(pattern.length + 1).keys())
        ).pop();
       
        if (cost <= maxCost) result.push([word, cost]);
        return result;
    }, []);


/**
 * Insert a pattern into a Trie-like data structure.
 * 
 * In this case, we assume the struct is an object, containing
 * self-similar nested objects.
 * 
 * Depth first serach in reverse. 
 * 
 * @param {*} param0 
 */
const trie = ({
    words=[], 
    root={},
    encode=(weight)=>weight+1,
    initialWeight=1
}) => 
    words.reduce((root, pattern) => {
        let node = root;
        [...pattern].forEach(c => {
            if (typeof node.children === "undefined" || !node.children)
                node.children = {};
            if (!(c in node.children)) node.children[c] = {};
            
            // Descend one level and encode traversal of path
            node = node.children[c];
            node.weight = 
                initialWeight && encode ?
                ((typeof node.weight === "undefined" || !node.weight) ||
                encode(node.weight)) :
                undefined;    
        });
        node.word = true;
        return root;
    }, root
);


/**
 * Recursive descend through a Trie object.
 * 
 * If the previous row is not supplied, assume that it is the entry point
 * and assigned the default first row.
 * 
 * @param {*} param0 
 */
function recurse({
    node, 
    pattern, 
    maxCost,
    symbol="",
    previous=null,
}) {
    // on entry (no symbol), init previous value to pass down
    const row = symbol ? 
        calculateRow({
            previous, 
            word: pattern, 
            symbol
        }) : 
        Array(Array(pattern.length + 1).keys());

    // cost of this word
    const isWord = "word" in node && node.word;
    const self = isWord && row[row.length-1] <= maxCost ?
        [[symbol, row[row.length-1]]] : []

    // don't descend if we've reached our thresholds
    const descend = 
        Math.min(...row) <= maxCost &&
        typeof node.children === "object";
    
    // cost of child words
    const children = !descend ? [] : 
        Object.entries(node.children)
            .map(([symbol, node])=>
                recurse({
                    node,
                    pattern,
                    maxCost,
                    symbol,
                    previous: row
                }))
            .map(([suffix, cost])=>{
                console.log({suffix, cost});
                return [symbol+suffix, cost]
            });
    
    return self + children;
};

/**
 * HTTP method
 */
const handler: Handler = async ({
    body
}) => {
    try {    
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(JSON.parse(body))
        }; 
    } catch (err) {
        return { 
            statusCode: err.statusCode || 500, 
            body: err.message
        };
    }
}



export {handler}