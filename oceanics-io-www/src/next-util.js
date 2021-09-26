import fs from "fs";
import matter from "gray-matter";
// import path from "path";


export const readMarkdownContent = (source) => {

    const directory = fs.readdirSync(source);
    const resources = directory.filter((name) => name.endsWith(".mdx") || name.endsWith(".md"))
    
    const nodes = resources.map((name) => {
        const data = fs.readFileSync(`${source}/${name}`, "utf8")
        return matter(data)
    })
    return nodes
}
