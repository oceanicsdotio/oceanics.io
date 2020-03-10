using System;
using System.Collections;
using System.Collections.Generic;
using static System.Diagnostics.Process;
using static neritics.json;

namespace neritics {

    // Simulation wrapper for ShellSIM population object
    class Kernel : ShellSIM.Population {

        // Program and event loop
        static void Main(string[] args) {

            int pid = GetCurrentProcess().Id;
            string status = "preflight";
            string message = "preflight";
            string stage = "Initialization";

            int step = 0;
            json alias = aliases();
            json config = defaults();
            json inputs = forcing();
            json userForcing;
            json userParams;

            config.send(status);
            inputs.send(status);
            userParams = json.receive();
            config.update(userParams);

            var kernel = new Kernel();
            try {
                kernel.start(config, alias);
                status = "ready";
                stage = "Runtime";
            }
            catch {
                status = "error";
                message = "start simulation";
            }

            while (status.Equals("ready")) {
                try {
                    userForcing = json.receive();
                    inputs.update(userForcing);
                }
                catch {
                    status = "done";
                    message = "no new messages";
                    break;
                }

                try {
                    kernel.run(step, inputs, config);
                    step = step + 1;
                }
                catch {
                    status = "error";
                    message = "simulation step";
                    break;
                }

                try {
                    kernel.state(step, config).send(status);
                }
                catch {
                    status = "error";
                    message = "send results";
                    break;
                }
            }

            var notification = new json() {{"message", message}};
            int code = 0;

            if (status.Equals("error")) {
                json.error(stage, notification);
                code = 1;
            }

            if (status.Equals("done")) {
                notification.send("done");
            }

            System.Environment.Exit(code);


        }

        public void start(json config, json alias) {
            StartSIM(
                alias[config["species"]],
                alias[config["ploidy"]],
                config["volume"],
                config["shell length"],
                config["weight"],
                config["dry weight"],
                config["standard weight"],
                alias[config["current mode"]],
                config["dt"],
                config["p:c"],
                config["n:c"],
                config["harvest size"],
                alias[config["culture"]]
            );
        }

        public void run(int step, json inputs, json config) {
            RunSIM(
                (int) Math.Ceiling(step * config["dt"]), // determine day number for internal clock state
                inputs["temperature"],
                inputs["salinity"],
                inputs["exposure"],
                inputs["current"],
                inputs["oxygen"],
                inputs["chlorophyll"],
                inputs["particulate organic matter"],
                inputs["total particulate matter"],
                inputs["particulate organic carbon"],
                (int) inputs["nseed"],
                inputs["harvest fraction"],
                0.0,
                0.0,
                0.0,
                0.0,
                0.0,
                0.0
            );
        }

        private json state(int step, json config) {
            return new json() {
                {"time", step * config["dt"]},
                {"weight", TFW}, // wet weight, grams
                {"oxygen uptake", CumOV}, 
                {"chlorophyll uptake", CumFRCHL}, 
                {"nitrogen uptake", CumFRON}, 
                {"nitrogen excretion", CumNE}, 
                {"ammonia loss", CumAL},
                {"deposition", CumTDTPM}
            };  
        }
        
        // Dictionary of default or null values.
        private static json defaults() {
            return new json() {
                {"species", "oyster"}, // species identifier within ShellSIM
                {"culture", "midwater"}, // culture type
                {"ploidy", "diploid"}, // 0: diploid, reproductive, has spawning losses
                {"current mode", "series"}, // 0-constant, 1-tidal average, 2-timeseries
                {"weight", 0.0}, // total wet weight, grams -- must specify 1 of 3 size inputs
                {"dry weight", 0.0}, // initialized from total fresh weight
                {"shell length", 0.0}, // initialized from total fresh weight
                {"standard weight", 0.0}, // standardized output, grams
                {"p:c", 0.00943396226415}, // phosphorus to carbon ratio, Redfield
                {"n:c", 0.150943396226}, // nitrogen to carbon ratio, Redfield
                {"volume", 1000.0}, // control volume for density dependence, m3
                {"harvest size", 1000.0},  // fresh weight at which to remove, grams
                {"dt", 1.0}
            };  
        }
        
        // Generate forcing dicitonary that will be updated on each input read.
        private static json forcing() {
            return new json() {
                {"temperature", 20.0}, // deg C
                {"chlorophyll", 6.0}, // ugL
                {"oxygen", 8.0}, //
                {"salinity", 32.0}, 
                {"current", 20.0}, // current speed, cms
                {"exposure", 0.0}, // fraction of time step during which aerial exposure occurs
                {"particulate organic matter", -1.0}, // mgL
                {"total particulate matter", -1.0}, // mgL
                {"particulate organic carbon", -1.0}, //ugL
                {"nseed", 0}, // number of seed to start
                {"mortality", 0.0},
                {"harvest fraction", 0.0}
            }; 
        }
        
        // Generate alias dictionary for translating inputs
        private static json aliases() {
            return new json() {
                {"oyster", 13},
                {"midwater", 1},
                {"bottom", 2},
                {"diploid", 0},
                {"triploid", 1},
                {"tidal average", 1},
                {"constant", 0},
                {"series", 2}
            };
        }
    }
}
