import {useState, useEffect} from "react";

export default (context, assets, programs) => {

    const [frontBufferStage, setFrontBufferStage] = useState(null);

    useEffect(() => {
        if (!context || !assets || !programs) return;

        setBackBufferStage(() => (state, back, screen) => () => Object({
            program: programs.screen,
            textures: [
                [assets.textures.uv, 0],
                [state, 1],  // variable
                [back, 2]  // variable
            ],
            attributes: [assets.buffers.quad],
            parameters: PARAMETER_MAP.screen,
            framebuffer: [assets.framebuffer, screen],  // variable
            topology: [context.TRIANGLES, 0, 6],
            viewport: [0, 0, ref.current.width, ref.current.height]
        }));
    }, [context, assets, programs]);

    return render
}