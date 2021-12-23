import type {Handler} from "@netlify/functions";
import {readFileSync} from "fs";

const WELL_KNOWN_TEXT: string[] = readFileSync(require.resolve("./words.txt"), "utf8").split("\n");


interface RowAccumulation {
    previous: number[];
    word: string;
    symbol: string;
}

const calculateRow = ({previous, word, symbol}: RowAccumulation): number[] => {

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

interface ISearch {
    words: string[];
    pattern: string;
    maxCost: number;
}

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
}: ISearch) => {

    const costCompare = Array(Array(pattern.length + 1).keys());
    const inner = (row: any[], symbol: string) => 
        calculateRow({
            previous: row, 
            word: pattern, 
            symbol
        })

    const outer = (result: [string, number][], word: string) => { 
        //@ts-ignore
        const cost = [...word].reduce(inner, costCompare).pop();
        if (cost <= maxCost) result.push([word, cost]);
        return result;
    }

    return words.reduce(outer, []);
}

interface INode {
    children?: {[key: string]: INode};
    weight?: number;
    word?: boolean;
}

interface ITrie {
    words?: string[];
    root?: INode;
    initialWeight?: number;
    encode?: (arg: number)=>number
}

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
}: ITrie) => {

    const inner = (node: INode) => (key: string) => {
        if (typeof node.children === "undefined") {
            node.children = {}
        }
        if (!(key in node.children)) node.children[key] = {};
        
        // Descend one level and encode traversal of path
        node = node.children[key];
        if (typeof node.weight === "undefined" || !node.weight) {
            node.weight = initialWeight;
        } else {
            node.weight = encode(node.weight);
        }
    }
    
    const reducer = (root: INode, pattern: string) => {
        let node = root;
        [...pattern].forEach(inner(node));
        node.word = true;
        return root;
    }

    return words.reduce(reducer, root);
}

interface IRecurse {
    node: INode;
    pattern: string;
    maxCost: number;
    symbol?: string;
    previous: number[];
}

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
    previous,
}: IRecurse): string[] {
    // on entry (no symbol), init previous value to pass down
    //@ts-ignore
    const row: number[] = symbol ? 
        calculateRow({
            previous, 
            word: pattern, 
            symbol
        }) : 
        Array(Array(pattern.length + 1).keys());

    // cost of this word
    const isWord = "word" in node && node.word;
    const self = isWord && row[row.length-1] <= maxCost ? [[symbol, row[row.length-1]]] : []

    // don't descend if we've reached our thresholds
    if (Math.min(...row) <= maxCost && typeof node.children === "object") {
        //@ts-ignore
        return self
    } else {
        const mapNodes = ([symbol, node]: [string, INode]) => {
            const [suffix, cost] = recurse({
                node,
                pattern,
                maxCost,
                symbol,
                previous: row
            });
            return [symbol+suffix, cost]
        }
        //@ts-ignore
        return self + Object.entries(node.children??{}).map(mapNodes)
    }
};

/**
 * HTTP method
 */
const handler: Handler = async ({
    body
}) => {

    try {    
        const {pattern, maxCost} = JSON.parse(body??"");
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(search({words: WELL_KNOWN_TEXT, pattern, maxCost}))
        }; 
    } catch (err: any) {
        return { 
            statusCode: err.statusCode || 500, 
            body: err.message
        };
    }
}



export {handler}