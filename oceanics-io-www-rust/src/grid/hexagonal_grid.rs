pub mod hexagonal_grid {
    use wasm_bindgen::prelude::*;
    use wasm_bindgen::JsValue;
    use web_sys::CanvasRenderingContext2d;

    struct Hexagon;

    impl Hexagon {
        pub fn decode(i: &usize, j: &usize) -> [f64; 2] {

        }

        pub fn encode(x: &f64, y: &f64) -> [usize; 2] {

        }

        pub fn draw(&self, ctx: &CanvasRenderingContext2d, x: &f64, y: &f64) {

            ctx.translate(self.x, self.y).unwrap();
            ctx.begin_path();
            ctx.move_to(0.0, diag);
            for _kk in 0..5 {
                ctx.rotate(2.0*std::f64::consts::PI/6.0).unwrap();
                ctx.line_to(0.0, diag);
            }
            ctx.close_path();

            ctx.stroke();

        }
    }

    struct GridDimension {
        cells: usize,
        delta: f64,
        size: f64
    }

    pub struct HexagonalGrid {
        x: GridDimension,
        y: GridDimension,
        diagonal: f64,
    }

    impl HexagonalGrid {

        pub fn new (nx: usize, width: f64) -> HexagonalGrid {

            let dx = width / nx as f64;
            let diag = dx / 3.0_f64.sqrt();
            let dy = 1.5*diag;

            // let dx = 
            HexagonalGrid {
                diagonal: diag,
                x: GridDimension {
                    cells: nx,
                    delta: dx,
                    size: width
                },
                y: GridDimension {
                    cells: nx,
                    delta: dy
                }
            }
        }

        #[wasm_bindgen]
        pub fn draw(&self, ctx: &CanvasRenderingContext2d, w: f64, h:f64, mx: f64, my: f64, color: JsValue, line_width: f64, _alpha: f64) {

            ctx.set_stroke_style(&color);
            ctx.clear_rect(0.0, 0.0, w, h);
            ctx.set_line_width(line_width);
     
            let nx = self.nx;
            let dx = w / self.nx as f64;
            let diag = dx / 3.0_f64.sqrt();
            let dy = 1.5*diag;
            let ny = ((h - 0.5*diag) / dy).floor() as usize;

            for jj in 0..ny { // row

                for ii in 0..(nx - ((jj % 2) as usize)) {

                    let x = 0.5*dx*(1.0 + (jj % 2) as f64) + (ii as f64)*dx;
                    let y = diag + (jj as f64)*dy;
    
                    if ((x - mx).powi(2)  + (y - my).powi(2)).sqrt() > diag {
                        ctx.set_stroke_style(&color);
                    } else {
                        ctx.set_stroke_style(&"red".to_string().into());
                    }

                
                    ctx.save();
                    Hexagon::draw(ctx, &x, &y, &diag);
                    ctx.restore();
                }
            }
        }
    }
}