export async function getImageMetadata(url) {
    return fetch(url)
        .then(r => r.json())
        .catch(err => {
            console.log("Metadata Error", err)
        });
};


export async function initParticles(res) {
    return new Uint8Array(Array.from(
        { length: res * res * 4 }, 
        () => Math.floor(Math.random() * 256)
    ))
};

