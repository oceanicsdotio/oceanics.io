let runtime;

export const compile = async () => {

    runtime = await import('../wasm');
    runtime.panic_hook();
    return "hi";

};


export async function renderLoop() {

}

