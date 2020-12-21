const {readFileSync} = require("fs");
const words = readFileSync("/usr/share/dict/words").toString().split("\n");

const word1 = "ocean";
const word2 = "Aegean";


const levenshteinDistance = (word1, word2) => {
        
    const columns = word1.length + 1;
    const rows = word2.length + 1; 

    // build first row
    let currentRow = [...Array(columns).keys()];
   
    for (let row = 1; row < rows; row++) {
        let previousRow = currentRow;
        currentRow = [previousRow[0] + 1];

        for (let column = 1; column < columns; column++) {
            
            const insertCost = currentRow[column - 1] + 1;
            const deleteCost = previousRow[column] + 1;

            let replaceCost;
            if (word1[column - 1] !== word2[row - 1]) {
                replaceCost = previousRow[column - 1] + 1;
            } else {
                replaceCost = previousRow[column - 1];
            }
            currentRow.push(Math.min(insertCost, deleteCost, replaceCost));
        }
    }

    return currentRow.pop();
};


const search = ({words, pattern, maxCost}) => {
    console.log({pattern, maxCost});
    
    return words.reduce((acc, word) => { 
        const cost = levenshteinDistance(pattern, word);
        if (cost <= maxCost) acc.push([word, cost]);
        return acc;
      }, []);
};

function searchRecursive({node, symbol, pattern, previous, cost}) {

    let row = [previous[0] + 1];

    for (let column = 1; column < pattern.length + 1; column++) {
        row.push(Math.min(
            row[column - 1] + 1,
            previous[column] + 1,
            previous[column - 1] + parseInt(pattern[column - 1] !== symbol),
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


const insert = ({node, key}) => {
    [...key].forEach(c => {
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
words.forEach(key => insert({node, key}));

console.log({
    word1, 
    search: search({words, pattern: word1, maxCost: 2}),
    node,
    recursive: Object.entries(node.children).map(([k,v])=>searchRecursive({
        node: v, 
        pattern: word1, 
        cost: 2,
        previous: [...Array(word1.length + 1).keys()],
        symbol: k
    }))
});