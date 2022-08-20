const ctx: Worker = self as unknown as Worker;

type Template = {
  name: string
  spriteSheet: string
  probability?: number
  value?: number
  limit?: number
};
type Node = { slug: string };
type MessageData = [
  Node[],
  Template[],
  number
];
type Lookup = {[key: string]: string};

/**
 * Translate to normalized form used for fetching data. 
 */
const templateToSource = (worldSize: number, lookup: Lookup) => ({
  name,
  spriteSheet,
  probability = 0.0,
  value = 0.0,
  limit = worldSize * worldSize
}: Template) => ({
  key: name.toLowerCase().split(" ").join("-"),
  dataUrl: lookup[spriteSheet],
  limit,
  probability,
  value
})

/**
 * Generate the dataUrls for icon assets in the background.
 */
const parseIconSet = (
  nodes: { slug: string }[],
  templates: Template[],
  worldSize: number
) => templates.map(templateToSource(worldSize, Object.fromEntries(
  nodes.map(({ slug }) => [slug, slug])
)));

/**
 * Event handler
 */
const handleMessage = async ({ data }: MessageEvent) => {
  switch (data.type) {
    case "status":
      ctx.postMessage({
        type: "status",
        data: "ready",
      });
      return;
    case "parseIconSet":
      const [nodes, templates, worldSize]: MessageData = data.data;
      ctx.postMessage({
        type: "parseIconSet",
        data: parseIconSet(nodes, templates, worldSize),
      });
      return;
    default:
      ctx.postMessage({
        type: "error",
        message: "unknown message format",
        data
      });
      return;
  }
}

/**
 * On start will listen for messages and match against type to determine
 * which internal methods to use. 
 */
ctx.addEventListener("message", handleMessage)

// Trick into being a module and for testing
export { handleMessage }