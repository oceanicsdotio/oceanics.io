export const runtime = async () => {
    const runtime = await import('../wasm');
    runtime.panic_hook();
};