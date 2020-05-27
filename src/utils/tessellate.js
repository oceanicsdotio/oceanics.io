import {
    draw_fps,
    draw_caption,
    draw_hex_grid,
    Texture2D,
    RectilinearGrid,
    TriangularMesh,
    DrawingCanvas
} from "./space.js";


const RenderLoop = (props, f, args) => {
    let {ctx, canvas, caption} = props;
    let {width, height} = canvas;
    let frames = 0;

    const render = () => {
        let time = (performance.now() | 0.0) - props.start;
        f(ctx, width, height, frames, time, ...args);
        frames = draw_fps(ctx, frames, time | 0.0, "#FFFFFFFF");
        if (caption) {
            draw_caption(ctx, caption, 0.0, height, "#CCCCCC", "12px Arial");
        }
        requestAnimationFrame(render);
    };
    render();
};

export const HexagonalGrid = (props) => {

    let {ctx, canvas, caption, font} = props;
    let {width, height} = canvas;
    let frames = 0;
    const nx = 10;
    const ny = 10;

    let state = {
        x: 0.0,
        y: 0.0
    };

    canvas.addEventListener('mousemove', e => {

        const rect = e.target.getBoundingClientRect();

        Object.assign(state, {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        })
    });

    const render = () => {
        let time = (performance.now() | 0.0) - props.start;
        draw_hex_grid(ctx, width, height, state.x, state.y, "#FF00FF");
        frames = draw_fps(ctx, frames, time, "#FFFFFFFF");
        draw_caption(ctx, caption, 0.0, height, "#CCCCCC", font);
        requestAnimationFrame(render);
    };
    render();
};

export const RectilinearGridLoop = (props) => {

    const {ctx, canvas, caption, size} = props;
    const {width, height} = canvas;
    const grid = new RectilinearGrid(...size);

    let frames = 0;
    const render = () => {
        let time = (performance.now() | 0.0) - props.start;
        grid.animation_frame(ctx, width, height, frames, time, "#FF00FF");
        frames = draw_fps(ctx, frames, time, "#FFFFFFFF");
        draw_caption(ctx, caption, 0.0, height, "#CCCCCC", "12px Arial");
        requestAnimationFrame(render);
    };
    render();

};


export const TriangularMeshLoop = (props) => {

    const {ctx, canvas, size, stopAfter, caption} = props;
    const {width, height} = canvas;
    const tri = new TriangularMesh(...size, width, height);

    let frames = 0;
    const render = () => {
        let time = (performance.now() | 0.0) - props.start;
        tri.animation_frame(ctx, width, height, frames, time, "#FF00FF");
        frames = draw_fps(ctx, frames, time, "#FFFFFFFF");
        draw_caption(ctx, caption, 0.0, height, "#CCCCCC", "12px Arial");
        if (stopAfter && frames >= stopAfter) {
            return;
        }
        requestAnimationFrame(render)
    };
    render();
};


export const PixelData = (props) => {
    RenderLoop(props, Texture2D.fill_canvas, [])
};


export const DrawingCanvasLoop = (props) => {

    const {ctx, canvas, caption, size} = props;
    const {width, height} = canvas;
    // const grid = new RectilinearGrid(...size);
    const draw = new DrawingCanvas();

    let state = {
        x: 0.0,
        y: 0.0
    };

    canvas.addEventListener('mousemove', e => {

        const rect = e.target.getBoundingClientRect();

        Object.assign(state, {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        })
    });

    let frames = 0;
    const render = () => {
        let time = (performance.now() | 0.0) - props.start;
        draw.draw(ctx, width, height);
        frames = draw_fps(ctx, frames, time, "#FFFFFFFF");
        draw_caption(ctx, caption, 0.0, height, "#CCCCCC", "12px Arial");
        requestAnimationFrame(render);
    };
    render();
};

