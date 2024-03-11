import { useMemo, useEffect } from "react";
import useWorker from "../../hooks/useWorker";
 export type ModuleType = typeof import("@oceanics-io/wasm");

interface IMemoCache {
  documents: any[]
}

type Edge = {
  node: {
    frontmatter: {
      tags: string[];
      description: string;
    }
    fields: {
      slug: string;
    }
  }
}

type Dictionary = { [index: string]: { count: number; links: string[]; } }

type ICodex = {
  edges: Edge[];
  accessToken?: string;
  server?: string;
}

/**
 * Find similar symbolic patterns, for word matching usually.
 */
export const codex = async ({ edges }: ICodex): Promise<Dictionary> => {

  const mapping: Dictionary = {};

  edges.forEach(({ node }) => {
    const { frontmatter: { tags, description }, fields: { slug } } = node;

    (description.split(" ") || []).concat(tags).forEach((word: string) => {

      let parsed = word.trim().toLowerCase();
      const lastChar = word[word.length - 1]
      if (lastChar === "." || lastChar === "," || lastChar === "?") {
        parsed = word.slice(0, word.length - 1);
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

  return mapping;
};


// defined in global scope to force Webpack to bundle the script. 
const createWorker = () => 
  new Worker(new URL("../workers/memo.worker.ts", import.meta.url), { type: 'module' })

const useMemoCache = ({documents}: IMemoCache) => {
/**
 * Dedicated worker will be used to fetch data to render 
 * and cross-reference articles
 */
  const worker = useWorker(createWorker);

  /**
   * List of pointers to document objects in WASM runtime memory
   */
  const deserialized = useMemo(() => {
    return documents;
  }, []);

  /**
   * Listen for messages from the worker
   */
  useEffect(() => {
    if (!worker.ref.current) return;
    // start listener
    const remove = worker.listen(({ data }) => {
      switch (data.type) {
        default:
          console.warn(data.type, data.data);
          return;
      }
    });
    return remove;
  }, [worker.ref.current]);

  return deserialized;
};

export default useMemoCache;
