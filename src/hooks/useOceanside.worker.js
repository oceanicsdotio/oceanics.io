/**
 * Generate the dataUrls for icon assets in the background.
 * 
 * Not a heavy performance hit, but some of the sprite sheet logic can be moved in here
 * eventually as well.
 * 
 * @param {*} param0 
 */
export const parseIconSet = async ({nodes, templates, worldSize}) => {
    
    
    const lookup = Object.fromEntries(
        nodes.map(({relativePath, publicURL})=>
            [relativePath, publicURL])
    );

    return templates.map(({
        name,
        spriteSheet, 
        probability=null,
        value=null,
        limit=null
    })=>({
        key: name.toLowerCase().split(" ").join("-"),  
        dataUrl: lookup[spriteSheet],
        limit: limit ? limit : worldSize*worldSize,
        probability: probability ? probability : 0.0,
        value: value ? value : 0.0
    }));
}
