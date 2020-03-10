import {DataStream, draw_caption, draw_fps} from "./space.js";

export const DataStreamLoop = (props) => {

    let {canvas, ctx, caption, font} = props;
    let {height, width} = canvas;
    let frames = 0;
    let stream = new DataStream(200);

    const render = () => {
        const time = (performance.now() | 0.0 )- props.start;
        stream.push(time, Math.random());
        stream.draw(ctx, 200.0, 200.0, "#FFFFFF");
        frames = draw_fps(ctx, frames, time, "#FFFFFF");
        draw_caption(ctx, caption, 0.0, height, "#CCCCCC", font);
        requestAnimationFrame(render);
    };
    render();

};

