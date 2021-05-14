/**
 * Global simulation variables. These are, thankfully, being phased out.
 */
pub mod variables {

    use std::f32::consts::PI;

    const include_algae: bool = true;

    const include_fish: bool = true;

    const strict_integrations: bool = false; // set mass transfer

    const MSTAGE: u8 = 4;

    const GRAV: f32 = 9.81;

    const traveld: f32 = 0.5787; // 50km/day in m/s

    fn epsx() -> f32 {
        (0.5*traveld.powi(2)).powf(0.5)
    }
    
    const epsx_sigma: f32 = 0.5*traveld;
    const sal_opt: f32 = 30.0;
    const sal_sigma: f32 = 5.0;
    const w1w1: f32 = 0.5;
    const h1h1: f32 = 0.75;
    const h2h2: f32 = 0.9;
    const boltzmann: f32 = 1.3806488e-23; // m2 ks s-2 K-1
    const microcystinRadius: f32 = 1.5e-9;
    const avogadro: f32 = 6022e+20; // per mol
    const planckNumber: f32 = 663e-7; // Js
    const lightSpeed: f32 = 2998e+5; // m/s

    const irradSurf: f32 = 650.0; // w m-2

    const A_RK: [f32; 4] = [0.0, 0.5, 0.5, 1.0];
    const B_RK: [f32; 4] = [1.0/6.0, 1.0/3.0, 1.0/3.0, 1.0/6.0];
    const C_RK: [f32; 4] = [0.0, 0.5, 0.5, 1.0];

    struct ControlVars { 
        DTOUT: f32,
        INSTP: f32,
        DHOR: f32,
        DTRW: f32,
        DTI: f32,
        TDRIFT: u16,
        IRW: u8,
    }


    impl ControlVars {
        fn new(ndays: u16) -> ControlVars{
            ControlVars{
                DTOUT: 0.1,
                DHOR: 0.1,
                INSTP: 1.0,
                DTI: 0.02,
                DTRW: 0.02,
                TDRIFT: 24 * ndays,
                IRW: 0
            }
        }
    }

    struct Mesh {
        N: u8,
        M: u8,
        KB: u8,
    }

    

    struct vars {
        P_SIGMA: bool,
        OUT_SIGMA: bool,
        F_DEPTH: bool,
    
        CASENAME: String,
        GEOAREA: String,
        OUTDIR: String,
        INPDIR: String,
        INFOFILE: String,
        LAGINI: String,
        FOLDERPREFIX: String,

        YEARLAG: u8,
        MONTHLAG: u8,
        DAYLAG: u8,
        HOURLAG: u8,
        IELAG: u8,
        ISLAG: u8,
        ITOUT: u8,
        NE: u8,
        MX_NBR_ELEM: u8,
        VXMIN: f32,
        VYMIN: f32,
        VXMAX: f32,
        VYMAX: f32,
    
        A1U: Vec<Vec<f32>>,
        A2U: Vec<Vec<f32>>,
        AWX: Vec<Vec<f32>>,
        AWY: Vec<Vec<f32>>,
        AW0: Vec<Vec<f32>>,
    
        NV: Vec<Vec<u8>>,
        NBE: Vec<Vec<u8>>,
        NTVE: Vec<u8>,
        ISONB: Vec<u8>,
        ISBCE: Vec<u8>,
        NBVE: Vec<Vec<u8>>,
        NBVT: Vec<Vec<u8>>,
    
        Z: Vec<f32>,
        ZZ: Vec<f32>,
        DZ: Vec<f32>,
        DZZ: Vec<f32>,
        H: Vec<f32>,
        D: Vec<f32>,
        EL: Vec<f32>,
        ET: Vec<f32>,
        XC: Vec<f32>,
        YC: Vec<f32>,
        VX: Vec<f32>,
        VY: Vec<f32>,
    
        U: Vec<Vec<f32>>,
        V: Vec<Vec<f32>>,
        W: Vec<Vec<f32>>,
        WW: Vec<Vec<f32>>,
        UT: Vec<Vec<f32>>,
        VT: Vec<Vec<f32>>,
        WT: Vec<Vec<f32>>,
        WWT: Vec<Vec<f32>>,
    
        T1: Vec<Vec<f32>>,
        S1: Vec<Vec<f32>>,
        R1: Vec<Vec<f32>>,
        TT1: Vec<Vec<f32>>,
        ST1: Vec<Vec<f32>>,
        RT1: Vec<Vec<f32>>,
        WTS: Vec<Vec<f32>>,
        KH: Vec<Vec<f32>>
    }

    

}