import { useEffect, useRef, useState, useMemo, type Dispatch, type SetStateAction } from "react";
type Listener = (args: { data: { data: unknown, type: string, message?: string}}) => void;

// In-memory log truncation
const LIMIT = 10;

// Actual handler
const onMessageHandler = (
    setValue: Dispatch<SetStateAction<string[]>>
) => ({data}: {data: string}) => {
    setValue((prev: string[]) => [...prev.slice(0, LIMIT-1), data]);
}

/**
 * Lifecycle controller for web workers. You need to actually start
 * the worker with the source code loaded externally.
 * 
 * Webpack needs a static path at build time to make loadable chunks
 * from the worker script.
 * 
 * There is probably a more clever way to do this.
 */
const useWorker = (createWorker: () => Worker) => {

    const listening = useRef<boolean>(false);
    const worker = useRef<Worker>(createWorker());
    const [, setMessages] = useState<string[]>([]);
    const listener = onMessageHandler(setMessages);

    // Init and start only once
    const start = () => {
        worker.current?.addEventListener("message", listener, { passive: true });
        listening.current = true
        worker.current?.postMessage({ type: "status" });
    }

    // Remove listener and kill worker.
    const terminate = () => {
        if (!worker.current) return;
        if (listening.current) worker.current.removeEventListener("message", listener);
        worker.current.terminate();
    }

    // Add external event listener.
    const listen = (callback: Listener) => {
        worker.current?.addEventListener("message", callback, { passive: true });
        return () => {
            worker.current?.removeEventListener("message", callback);
        };
    }

    // Shorthand to send a message, or silently fail
    const post = (message: {type: string, data: any}) => {
        worker.current?.postMessage(message);
    }

    // Start if we get a worker on load.
    useEffect(() => {
        start();
        return terminate;
    }, [])

    return {
        ref: worker,
        terminate,
        listen,
        post
    }
}

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
