const ctx: Worker = self as unknown as Worker;

type Template = {
  name: string
  spriteSheet: string
  probability?: number
  value?: number
  limit?: number
};
type Lookup = {[key: string]: string};
const ACTIONS = {
  parseIconSet: "parseIconSet"
}

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
const fetchAndParse = async (src: string, size: number) => {
  const response = await fetch(src);
  const {icons}: {icons: {sources: {slug: string}[], templates: Template[]}} = await response.json();
  const lookup = Object.fromEntries(icons.sources.map(({ slug }) => [slug, slug]));
  const result = icons.templates.map(templateToSource(size, lookup));
  return result;
}

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
    case ACTIONS.parseIconSet:
      ctx.postMessage({
        type: ACTIONS.parseIconSet,
        data: await fetchAndParse(data.data.src, data.data.size),
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