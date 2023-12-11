/**
 * Get image data from S3, the Blob-y way. 
 */
const fetchImageBuffer = async (url: string): Promise<Float32Array> => {
  const blob = await fetch(url).then(response => response.blob());
  const arrayBuffer: string | ArrayBuffer | null = await (new Promise(resolve => {
    const reader = new FileReader();
    reader.onloadend = () => { resolve(reader.result); };
    reader.readAsArrayBuffer(blob);
  }));
  if (arrayBuffer instanceof ArrayBuffer) {
    return new Float32Array(arrayBuffer);
  } else {
    throw TypeError("Result is not ArrayBuffer type")
  }
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

type HistogramResult = { total: number; max: number; };
/**
 * Calculate summary statistics for the bins, to help with rendering
 * and UI metadata.
 * 
 * There should only be positive values for the y-axis.
 */
export const histogramReducer = (histogram: [number, number][]): HistogramResult => histogram.reduce(
  ({ total, max }, [bin, count]) => {
    if (count < 0) throw Error(`Negative count value, ${count} @ ${bin}`);

    return {
      total: total + count,
      max: Math.max(max, count)
    }
  },
  { total: 0, max: 0 }
);

/**
 * Create vertex array buffer
 */
export async function initParticles(res: number) {
  return new Uint8Array(Array.from(
    { length: res * res * 4 },
    () => Math.floor(Math.random() * 256)
  ))
}
