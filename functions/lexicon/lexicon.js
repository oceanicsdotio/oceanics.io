const {readFileSync} = require("fs");
const words = readFileSync("/usr/share/dict/words").toString().split("\n");

const word1 = "ocean";
const word2 = "Aegean";

/**
 * Calculate the similarity of two patterns, usually words
 * for the purpose of auto-correct or spell checking
 */
const levenshteinDistance = (a, b) => {
         
    // build first row
    let row = [...Array(a.length + 1).keys()];
   
    // iterate rows
    for (let ii = 1; ii < b.length + 1; ii++) {

        const previous = row;
        row = [previous[0] + 1];

        // iterate columns
        for (let jj = 1; jj < a.length + 1; jj++) {
            row.push(Math.min(
                row[jj - 1] + 1, // insert, 
                previous[jj] + 1, // delete, 
                previous[jj - 1] + (a[jj - 1] !== b[ii - 1] | 0) // replace
            ));
        }
    }

    return row.pop();
};



/**
 * Recursive descend through a Trie object.
 * 
 * If the previous row is not supplied, assume that it is the entry point
 * and assigned the default first row.
 * 
 * @param {*} param0 
 */
function searchRecursive({node, symbol, pattern, previous=null, cost}) {

    if (!previous) previous = [...Array(word1.length + 1).keys()]
    
    let row = [previous[0] + 1];

    for (let jj = 1; jj < pattern.length + 1; jj++) {
        row.push(Math.min(
            row[jj - 1] + 1,
            previous[jj] + 1,
            previous[jj - 1] + parseInt(pattern[jj - 1] !== symbol),
        ));
    }
    
    const filtered = Math.min(...row) <= cost ? 
        Object.entries(root.children).map(([k, v])=>
            searchRecursive({
                node: v,
                symbol: k,
                pattern,
                previous: row,
                cost
            })) : [];
    
    const totalCost = row.pop();
    const actualCost = (totalCost < cost && root.word) ? 
        [node.word, totalCost] : []
 
    return filtered + actualCost;
};

const Node = () => Object({
    word: null,
    weight: 0,
    children: {}
});


/**
 * Simple iterative search loops through all words and preserves
 * a record of those which satisfy the maximum mutations
 * 
 * @param {*} param0 
 */
const search = ({words, pattern, maxCost}) => {
    console.log({pattern, maxCost});
    
    return words.reduce((acc, word) => { 
        const cost = levenshteinDistance(pattern, word);
        if (cost <= maxCost) acc.push([word, cost]);
        return acc;
      }, []);
};

/**
 * Insert a pattern into a Trie-like data structure.
 * 
 * In this case, we assume the struct is an object, containing
 * self-similar nested objects.
 * 
 * @param {*} param0 
 */
const insert = ({node, pattern}) => {
    [...pattern].forEach(c => {
        if (!(c in node.children)) {
            node.children[c] = Node();
        }
        node = node.children[c];
        node.weight += 1;
    });
};

// exports.handler = async ({
//     queryStringParameters
// }) => {
//     try {    
//         return {
//             statusCode: 200,
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify(JSON.parse(Body.toString('utf-8')))
//         }; 
//     } catch (err) {
//         return { 
//             statusCode: err.statusCode || 500, 
//             body: err.message
//         };
//     }
// }

const node = Node();
words.forEach(pattern => insert({node, pattern}));

console.log({
    word1, 
    search: search({words, pattern: word1, maxCost: 2}),
    // node,
    // recursive: Object.entries(node.children).map(([k,v])=>searchRecursive({
    //     node: v, 
    //     pattern: word1, 
    //     cost: 2,
    //     symbol: k
    // }))
});