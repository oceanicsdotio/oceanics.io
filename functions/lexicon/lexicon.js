
const trie = () => {

    const metadata = {
        word: null,
        weight: 0,
        children: {}
    };

    const insert = ({root, key}) => {
        let node = root;
        [...key].forEach(c => {
            if (!(c in node.children)) {
                node.children[c] = trie();
            }
            node = node.children[c];
            node.weight += 1;
        });
    };

    const levenshteinDistance = ({word1, word2}) => {
        
        const columns = word1.length + 1;
        const rows = word2.length + 1;

        // build first row
        let currentRow = [0];
        for (let column = 1; column < columns; column++) {
            currentRow.push(currentRow[column - 1] + 1);
        }

        for (let row = 1; row < rows; row++) {
            let previousRow = currentRow;
            currentRow = [previousRow[0] + 1];

            for (let column = 1; column < columns; column++) {
               
                const insertCost = currentRow[column - 1] + 1
                const deleteCost = previousRow[column] + 1

                let replaceCost;
                if (word1[column - 1] != word2[row - 1]) {
                    replaceCost = previousRow[column - 1] + 1
                } else {
                    replaceCost = previousRow[column - 1]
                }
                currentRow.append(Math.min(insertCost, deleteCost, replaceCost))
            }
        }

        return currentRow[currentRow.length];
    };

    function searchRecursive({root, symbol, pattern, previous, cost}) {

        const _filter = (x) => x.length;

        let row = [previous[0] + 1];

        for (let column = 1; column < pattern.length + 1; column++) {
            row.push(Math.min(
                row[column - 1] + 1,
                previous[column] + 1,
                previous[column - 1] + int(pattern[column - 1] != symbol),
            ));
        }
        
        if (Math.min(row) <= cost) {
            filtered = Object.entries(root.children).map(([k, v])=>{
                return searchRecursive({
                    root: v,
                    symbol: k,
                    pattern,
                    previous: row,
                    cost
                })
            })
        } else {
            filtered = []
        }

        const totalCost = row[row.length];
     
        return filtered + (totalCost < cost && root.word) ? [node.word, totalCost] : [];
    };
};

exports.handler = async ({
    queryStringParameters
}) => {
    try {    
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(JSON.parse(Body.toString('utf-8')))
        }; 
    } catch (err) {
        return { 
            statusCode: err.statusCode || 500, 
            body: err.message
        };
    }
}
