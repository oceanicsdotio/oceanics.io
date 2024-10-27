type ModuleType = typeof import("@oceanics/app");
type WorkerCache = {
  handlers: { [key: string]: Function },
};
let CACHE: WorkerCache | null = null;
const MOBILE = Boolean(
  navigator.userAgent.match(
    /Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i
  )
);
/**
 * Only perform startup routine once
 */
async function startup(message: MessageEvent){
  const { data: {user} } = message.data;
  if (typeof user === "undefined") {
    throw Error(`worker missing user data: ${JSON.stringify(message)}`)
  }
  const { token: { access_token = null } }: any = JSON.parse(user);
  if (!access_token) {
    throw Error(`worker missing access token`)
  }
  const { panic_hook, getIndex, getCollection, getEntity, createEntity, deleteEntity, getLinked } = await import("@oceanics/app");
  // Provide better error messaging on web assembly panic
  panic_hook();
  return {
    handlers: {
      getIndex: getIndex.bind(undefined, access_token),
      getCollection: getCollection.bind(undefined, access_token),
      getLinked: getLinked.bind(undefined, access_token),
      getEntity: getEntity.bind(undefined, access_token),
      createEntity: createEntity.bind(undefined, access_token),
      deleteEntity: async (query: any) => {
        const result = await deleteEntity(access_token, query)
        return {
          success: result,
          uuid: query.left_uuid
        }
      }
    }
  }
}
/**
 * On start will listen for messages and match against type to determine
 * which internal methods to use. 
 */
async function listen(message: MessageEvent) {
  if (!CACHE) {
    try {
      CACHE = await startup(message);
    } catch (error: any) {
      self.postMessage({
        type: "error",
        data: error.message
      });
      return
    }
  }
  const { handlers: { [message.data.type]: handler = null } } = CACHE as WorkerCache;
  if (!handler) {
    self.postMessage({
      type: "error",
      data: `unknown message format: ${message.data.type}`
    });
    return
  }
  try {
    const data = await handler(message.data.data.query, message.data.data.body);
    self.postMessage({
      type: message.data.type,
      data
    });
  } catch (error: any) {
    self.postMessage({
      type: "error",
      data: error.message
    });
  }
}
/**
 * Respond to messages
 */
self.addEventListener("message", listen);


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

    const costCompare = [...Array(pattern.length + 1).keys()];
    const inner = (previous: number[], symbol: string) => 
        calculateRow({
            previous, 
            symbol,
            word: pattern
        })

    const outer = (result: [string, number][], word: string) => {
        const cost: number = [...word].reduce(inner, costCompare).pop() as number;
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
export const trie = ({
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
        const node = root;
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
export function recurse({
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
}
