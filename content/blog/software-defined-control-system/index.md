---
title: Software-defined control system
date: "2019-02-05T12:00:00.000Z"
description: |
  Several years ago, I built something pretty neat for a National Science Foundation
  grant. The code has been incorporated into other projects at this point, but this 
  piece describes the design and implementation of a software defined control system
  for studying ocean biochemistry by simulating climate futures in a controlled setting.
  
tags: ["control systems", "pid", "iot", "python", "ocean acidification", "climate"]
---

## Background

*In silico* growth and physiological simulations of aquaculture species can help determine new locations for farming. This is true for any natural resource or agricultural study. However, these type of studies are limited by availability of locally-tuned parameters, and lack of coordinated validation. Field studies to fill knowledge gaps suffer from lack of control over co-stresses, and lack of accessibility to remote sites. Laboratory experiments are more controlled, and can be used to establish empirical rates for bioenergetic models. 

Microcosms studies use either flow-through or re-circulating aquaculture systems (RAS). For flow-through, the properties of the water supply determine the growing conditions of the experiment. Modulating these requires implementing thermal and chemical seawater conditioning. Recirculation must offset the biology in the culture volume through aeration and waste removal. 

Of special interest is dynamics of toxins from harmful phytoplankton. Any experiments involving the introduction of toxic phytoplankton will have quarantine procedures that require recirculation, and will therefore require seawater conditioning to provide natural conditions.

The physical components of a seawater control system consists of a chilling plan, heat exchangers, gas dosing apparatus, experiment tanks, tank sensors, and control system computer. Commercially-available control solutions are intended primarily for the aquaculture and aquarium industries, and are not flexible enough to replicate diurnal, seasonal or high-frequency conditions without supervision. 

This work describes a control system for replaying conditions from ocean observations or previous laboratory experiments by sensing, logging and manipulating temperature, dissolved oxygen, and pH for a multiplicity of mixing reservoirs. Feedback control maintains arbitrary uniform or oscillatory conditions within these units,  to automate the replication of physiochemical studies at both coastal and land-locked marine laboratories. 

## Requirements

### Functional

I did requirement scoping based on my own experience, and by canvasing marine scientists across multiple specializations. We identified common user stories, and from these the basic capabilities became: 

* start experiments from a friendly graphical user interface 
* monitor results in real-time
* change conditions on the fly
* reproduce experiments with minimal configuration

But, these are pretty high level, and don't really describe what or how we are trying to run experiments. What's an experiment anyway? It is pretty much the level of specificity you get when dealing with technical users who aren't in the habit of building things from scratch. Essentially, the problem I run into with "agile" projects, is that people start to get pissed when they must think deeply and formally about requirements. 

High-level functional requirements (FR) are first-order, derived requirements which describe how a system must work based on these design objectives. 

Whether you to want to call them features, stories, or design objectives, for this project there were three:

1. Control any combination pH, DO, and T in multiple experimental units
2. Follow single set-point or reference series
3. Operate manually or without supervision

To achieve O1, the system must use streaming serial data (FR1) to actuate relays (FR2). The software functions as a proportional-intergral-derivative (PID) controller for generic processes. Acquisition and actuation scales to any number of replicates, limited by the infrastructure of the facility. Implementation can be dramatically different, depending on the reservoir and sensor/actuator pairs. 

The algorithm uses time discretization and relay multiplexing to produce proportional control signals for on-off devices (O2). This allows steady-state, perturbation, or replication experiments based on a fixed reference or time series (FR3). Using a browser interface, the user can load, create, and save instances for replicating/sharing experiments (FR4). 

Finally, the system must operate robustly with or without supervision. When facilities are remote, and experiments last weeks–months, logistics and trust can impede the use of  laboratory infrastructure investments. Error checking practices are implemented for communications with sensors and actuators (FR5). Warnings and errors are logged, and the system administrator and researcher are alerted. 

Data are stored for visualization and controller skill assessment (FR6). Visual assessment is through a graphical user interface (GUI). Maintenance and calibration requires that systems need to shutdown and restart without interrupting the experiment. For each mode of actuation there is an additional enclosure, with a 3-position toggle switch for ON, OFF, and AUTO modes to switch seamlessly to manual control (FR7). The GUI indicates overrides, and shows plain text so that the values can be recorded manually. Experiments can be compiled in advanced and shared or started at a pre-determined time (FR8).



| # | Requirements (Shall…) | Objective | Addressed    |
| ---- | :------------------------------------ | :----: | :----------: |
| 1 | Read tank conditions through streaming serial data | 1 | Hardware |
| 2 | Output control signal for actuation | 1  | Hardware |
| 3 | Follow single set point or arbitrary reference signal | 2     | **Software** |
| 4 | Import, edit, and export reference series  | 2 | Browser |
| 5 | Error check I/O and internal state | 3 | **Software** |
| 6 | Store data for visualization and validation | 3     | **Software** |
| 7 | Switch control modes while underway  | 3  | Hardware |
| 8 | Import, edit, and export configuration | 3 | Browser |



### Performance

Performance requirements (PR) determine to what specifications a FR is implemented. Sensor ranges and resolutions will be determined by equipment, but should span the natural conditions in the region of interest. 

Sensing temperatures 0–50 ºC with 0.2 resolution (PR1) is sufficient. For RAS, the primary use of control is to open a solenoid valve and shunt chilled ethylene glycol cooling fluid from the central chilled loop through heat exchangers at each experimental unit. Cooling is a function of volume, temperature, and flow rate. 

Range for pH sensing should be 4–10 with 0.01 resolution, and accuracy near the 0.1 industry standard (PR2). For flow-through systems in colder water, response time should be <60 seconds, and the lower operating range 0ºC. Gulf of Maine pH is below 8, and experiments typically acidify to ~7.5 by bubbling CO<sub>2</sub> into a sump, while pH rises through relaxation (PR4). Measured pH is transformed to a mass-conservative hydrogen number with mol units, and inverted to conform with other scales, $H=–V*10–{pH}$ (PR5). 

Oxygen optodes (meaning they are optical) measure 0–25 mg/L with 0.01 resolution and 60 response time (PR3), and accuracy near ±0.08 mg/l. Anoxic/hypoxic studies will have  accuracy no better than ±0.02 mg/l. Actuation lowers DO by adding N<sub>2</sub> (PR4). Removal is a function of sump volume, gas delivery, and flow rate. The continuous PID control signal must be discretized, then interpreted to timed on-off sequences sent to a network-enabled relay board (PR6). 

The system needs also to be accessible to undergraduates, operate continuously, and be flexible enough to see use at multiple facilities. This requires robust. error checking and handling (PR7–8).



| #  | Requirements (Shall...) | Func. Req. | Addressed |
| ---- | ---------------------------------------- | ------ | --------- |
| 1  | Measure and log T=0–50ºC with 0.2 resolution     | 1    | Hardware  |
| 2  | Measure and log pH=4–10 with 0.01 resolution     | 1    | Hardware  |
| 3  | Measure and log DO=0–25 mg/L with 0.01 resolution | 1    | Hardware  |
| 4  | Provide up and/or down actuation for control variables | 2    | Hardware  |
| 5  | Transform measurements to control units          | 2    | **Software** |
| 6  | Generate discrete control signal for time multiplexing | 2    | **Software** |
| 7  | Detect and handle sensor communication errors    | 5    | **Software** |
| 8  | Detect and handle relay errors or control failure | 5    | **Software** |



##  Algorithm

Controllers *try* to follow a specified set point or series. The control or simulation loop for this system is:

1. Wait for clock interrupt
2. Update sensor values
3. Compute continuous control signal
4. Generate discrete signal
5. Time actuate discrete signal
6. Update controller state
7. Interpolate new reference value
8. Sleep

Reference series consist of any number of (time, value) pairs. Time is expressed as an offset or elapsed time and a start time. If there is no control signal, the current conditions on start are held constant. 

If there is one value, but no time, the controller holds a single set point. With multiple values, there must be a matching number of times and values. These will be interpreted differently, depending on whether `RAMP` and `REPEAT` are enabled. Ramping can perform linear or spline interpolation between points. A repeating series loops continuously, while a non-repeating series will hold the last value.

A simple diurnal experiment with one variable could be accomplished by loading a file with (00:00, 5), (12:00, 10) and turning ramping and repeat on, with a 12-hour tail. The controller will start with a set point of 5, and use linear interpolation for intermediate values, until 12 hours have passed. The reference index then advances. Since `REPEAT` is enabled, the controller will wait the 12-hour tail, then rewind to the start index. 

The system forces a volumetric actuation rate ($U$) based on the error ($E$) between measured ($y$) and reference ($r$) values. This is modulated by internal system gain values: proportional ($k_p$), integral ($k_i$), and derivative ($k_d$). 

Proportional feedback means $U$ is proportional to error when $|E|<E_max$. Integral action has zero steady-state error, and can be viewed as a method for automatically generating a feed-forward term. Derivative action predicts future error, and should use a second-order filter for best results. A backward difference discretization scheme guarantees stability. The combined equation is

$U = kpE + ki \int{E·dt} + kd·E’$

The general mass-conservative thermo-molecular differential equation for a fixed-volume reservoir is,

$C’ = Q(C_0 – C)/V + U$

where $Q$ is the flow rate (L/s), $C_0$ is source concentration (liters<sup>-1</sup>), C is the measured concentration in the reservoir (L<sup>-1</sup>), $U$ is volumetric generation rate (L<sup>-1</sup>s<sup>-1</sup>), and $V$ is reservoir volume (L). 

The first term is dilution or enhancement by flow-through advection. In cases with source filtered water, the system will tend to relax back toward natural conditions if $U$ is nominally zero. In this configuration, $U$ is an experimentally determined piecewise function that combines actuation forcing and physical processes (out gassing, aeration, conduction, evaporation). 

Instantaneous mass flow residence time is $\tau={CV}\over{U}$ seconds. These parameters can be approximated empirically using,

$U \tau = –ln(1+{dtC’}\over{C})$   [3].

Gain is estimated during a training process at the beginning of each experiment. During calibration, $Q$ and $V$ are set by the user, and $U$ is calculated from a bump experiment (described later). Once $U$, $\tau$, and $k$ values are known, the dynamics of each reservoir can be simulated.

### Multiplexing

When performing binary actuation (e.g. compressed gas solenoid valves), the control output is transformed by pulse-width modulation (PWM). The time between sensor updates (T=60 s) is divided into regular intervals (t=6 s), assigned across the number of possible gas treatments (N=4). During each window only one valve can be open, which preserves the mass flow rate, even when operating in multiple tanks. 

During each step, $dt={T}\over{tN}$, the continuous control signal is discretized, $S=f(U)$, indicating how many of the assigned windows the device is on (Req. 19). Before an experiment, the operator will need to confirm that a saturated multiplex signal adds enough gas to compensate for dilution/exchange. A zero signal ($S_n$) will allow dilution, and a moderate signal (2<S_n<3) should just exceed the equilibrium rate. 

An example thirty-second sequence for four treatments might look like this, where each bit is a 1.5 second time slot:

$S_1: 1000 0000 0000 0000 0000$
$S_2: 0100 0000 0000 0100 0000$
$S_3: 0010 0010 0000 0010 0000$
$S_4: 0001 0001 0000 0001 0001$

To minimize the age of data being used to generate the control signal, the program goes through an initiation loop that monitors the update interval, and performs optimization steps. 

The refresh rate depends on the system, but in our case is no faster than 1 minute. This limitation is based on using a plain text transfer file for data. The sensor period is 30 seconds, but two values are written simultaneously to file every 60 seconds.

During the calibration/training sequence, the program connects to the logging computer, and gets the system time and age of the most recent data. We then probe the file every few seconds until there is new data. The newest data should be fresh, and the previous data should be about 30 seconds old. The older data is used to generate the immediate control output, and the current data is used to generate the intermediate control, which is actuated in 30 seconds. 

Since the control data is 30 seconds old, and the equilibration time of the sensors is 30 and 60 seconds (for pH and DO respectively), the system is a little sluggish, and slow dilution and dosing rates should be used to prevent overshooting. Rates can be gradually increased as the control signal is conditioned over time. 



### Parameterization

Initial gain values are estimated in a Ziegler-Nichols test. After the update times are identified, the sensors equilibrate with the process media (seawater sump) for at least an hour, and preferably overnight.

The water should be in steady state (i.e. no biology, fixed or no dilution), and the gain should increase until an inflection point is passed. In the frequency domain test, $K_I=K_D=0$, and $K_P$ is increased until the system oscillates. The startup sequence consistent of five steps, which can be scheduled automatically overnight,

1. Detect update rate (00:05)
2. Sensor equilibration (3:00)
3. Bump tests (3:00)
4. Oscillation tests (3:00)
5. Controller stabilization (3:00)



## Implementation 

### Device network

In a prototype deployment, pH was measured by the fast-response pH::lyser with automatic temperature compensation; dissolved oxygen by an oxi::lyser with integrated temperature sensor. The SDI-12 outputs fed into a con::cube running embedded Linux and the proprietary moni::tool, which has a touchscreen and an embedded web server. The software ran locally and had direct access to logging files. The details aren’t so important as long as there is real-time access to measurements. 

The control apparatus consists of modular enclosures containing networked 16-channel 30 amp ProXR relay board, and battery back-up. For two-directional control with three variables, each treatment needs six channels.

The relay board connects to the network through a Lantronix XPort. Relays are sent an on command, with a timed length. The board monitors byte-like messages sent via TCP/IP, and accepts instructions with a specific format. This engages AC power to a solenoid valve, pump, or heater. The command sequences are discussed below.

In temperature control cases, these can also operate continuous-duty pumps to circulate cooling fluid through an overhead insulated pipe loop. Flow should be in parallel, preventing warm exhaust fluid from reducing efficiency in downstream heat exchangers. The method of actuation is opening solenoid valves, leaving seawater flowing to reduce fouling and simplify plumbing.	


### Hardware interfaces

A `VirtualController()` operates on a single variable in an `ExperimentalUnit()`:

```python
class ExperimentalUnit:
    '''
    Data structure describing a single reservoir or treatment. 
    Children are controllers. 
    Maps I/O assignments.
    '''
    name: string  # comprehensible name
    id: int  # unique identifier within facility
    controllers: [VirtualControllers]  # controls in exp. unit
    active: bool  # treatment is running
    
    def __init__(name=None): pass
    def __del__(): pass # logic for removal of controllers
    def start(): pass # start all child controllers
    def stop(): pass # shut down relays, stop routine
    def bind(sensorId: int, upId: int = None, downId: int = None): pass

```



Each controller instance owns one `VirtualSensor()`, one `ReferenceSeries()`, and up to two `VirtualRelays()` for positive and negative actuation. These are abstract objects for interacting with hardware. 



```python
class VirtualController:
    '''
    Object that encapsulates control functions, and can automatically
    calculate and store control parameters. Children are references,
    sensors and actuators. Parent is an experimental unit.
    '''
    name: str = ""
    id: int = 0
    gain_proportional: float = 0.0 # set during oscillation test
    gain_integral: float = 0.0 # set during bump test
    gain_derivative: float = 0.0 # set during bump test
    intergral_error: float = 0.0 # persistent error term for computing next value
    previous_error: float = None # last error
    sensor: VirtualSensor = VirtualSensor()
    up: VirtualRelay = None # child relay instance for up actuation
    down: VirtualRelay = None # child relay instance for down actuation
    reference: float = None # current target value
    
    def __init__(reference: float): pass
    def onoff(): pass # returns discrete up, down and zero signals
    def pid(): pass # returns continuous conditioned control signal
    def signal(): pass # function generates either binary or PID output signal
    def actuate(): pass # transforms signal to relay instructions
    def train(): pass # start self-parameterization and calibration tests
    def start(): pass # start experiment
    def shutdown(): pass # turn off all relays and stop updating
    def setGain(): pass
    def setError(): pass # set previous error value
    
```



Any number of controllers may be grouped together within a parent treatment. `ExperimentalUnits` are persistent, and keep track of event scheduling. They can be started, stopped, played back, etc. Most user interaction is at this level. 

The software needs to communicate with two pieces of hardware: the Ethernet relay control board, and the data logging terminal. The program uses the sensor data to generate commands for individuals relays associated with up and down actuation for process control. 

The terminal stores sensor data as comma-separated values. We access this by piping instructions to terminal through an `ssh` tunnel, or spawning a shell subprocess, and echoing back the footer of the most recent log file. 

```python
class ReferenceSeries:
	'''
	Abstract class for reference series. Children are timestamped values.
	Parent is a sensor.
	'''
	time: [datetime] = [] # times
    duration: timedelta = inf # total length of experiment/treatment
    value: [float] = [] # reference values
    ramp: bool = False # interpolate by best method
    repeat: int = 1 # sequence starts over
    current_index: int = None # current index position
    start_index: int = None # first index position used
    tail: datetime = None # relax to ambient
    acclimate: datetime = False # ramp from ambient
        
    def __init__(): pass
    def load(): pass # load values from file
    def reset(): pass # set initial index to zero, and rewind
    def rewind(): pass # set current index to initial value
    def interpolate(datetime): pass # value at intermediate times
    def acclimate(datetime): pass # append acclimation time to front and end.
```



This allows the program to access historical data, without needing native storage (Req. 6, 9, 15, 17). Each controller instance has a child `VirtualSensor` that represents one column of values. These are created during the controller binding routine. 



```python
class VirtualSensor:
    '''
    Abstract class wraps metadata with protocol and serial stream as virtual sensor. 
    Child is one subprocess. Parent is a controller.
    '''
    
    name: str  # locally unique name
    id: int # locally unique identifier
    connected: bool # communication is open and successful
    order: int # place of sensor value if using round-robin reporting
    sampletime: datetime  # time of last known sample
    label: str # name of variable
    variable: float  # last known value
    
    def __init__():
        pass
        
    def __del__():
        pass
        
    def index():
        # data column index or other information to extract value from text
        pass
    
    def update(filename: str, remote_install: bool = False):
        # get new value and time
        pass
```



The user must specify the order of the sensor in the logging file or serial string to correctly parse values and labels. The user may also optionally enable ssh tunneling to a remote data repository.  A sensor instance contains the name of the sensor found in the con::cube file header, the name/label of the measured value, the latest time stamp, and the measured value itself. These are updated automatically during the controller event loop, meaning that the controller must exist and be active for sensor instances to behave as expected. 



```python
class VirtualRelay:
    '''
    Abstract class describing methods of actuation. Parent is a controller.
    '''
    
    pole: Enum[str]  # single, double or triple
    throw: Enum[str] # same as above
    type: Enum[str] # normally open or normally closed
    relay_id: int # position on relay board, zero-indexed
    timer_id: int  # position of embedded timer
    state: bool # true is on, false is off
    
    def __init__(relayId: int):
        pass
        
    def __del__():
        pass
        
    def on(tcp_socket: Socket, duration: int = None):
        pass
    
    def off(tcp_socket: Socket):
        pass
    
    def recover(tcp_socket: Socket):
        # attempt to recover from loss of communication
        pass
    
    def get(tcp_socket: Socket):
        # get and save current relay state
        pass
```



### Experiment setup

The chemistry and temperature can be controlled in a reactor sump, or directly within tanks, depending the experimental design. The method works best in high volume, low flow tank. Ideally these will be insulated and capped to prevent exchange with the lab environment. The tanks used here were approximately 200 liters. It is necessary to know either the volume of water in the tank ($V$), or the total flow into and out of the tank ($F$). The calculation is easier with a fixed value of $F$. 

Users have access to library and control modes. Library imports data, creates experiments, and allows visual QA. Control prompts creation/selection of an experiment, or overrides one in progress. There are lots of button types referenced, this is a brief guide:

1. Select displays child buttons until the user makes a selection.
2. Press makes something happen!
3. Prompt opens dialogue before action (compatible with select/press).
4. Action executes a script (compatible with select/press).
5.ux Mode changes user context (compatible with select/press).

   

The following describes the steps to set up a gas dosing reactor. 



1. Plumb a flow-meter in line with a filtered seawater source and adjust $F$ (L/s) to the desired level. Lower $F$ uses less gas, but also increases residence time (and therefore ambient warming/cooling), and can reduce DO through respiration.
1. Install relevant sensors in the reactor, and allow the water to reach thermo-chemical equilibrium.
2. Measure the initial ambient $C$, assumed to be the same as the source water ($C_{source}$). The effective reaction rate at this point is zero ($C’=0$).
3. Turn the gas on manually, and bubble into the reservoir at the desired rate (set by eye) for several minutes. Obtain estimates of C’ at relevant control points (e.g. maximum and minimum values in the reference time series).
4. Turn the gas off ($r=0$), and measure/calculate the dilution rate at the same control points. Calculate the base addition rate from $r = C’ – F·(C_{source}–C)$.
5. The auto-calibration procedure will generate these numbers, but the initial process will help identify equipment malfunctions, and set a baseline for troubleshooting.
6. Create a blank experiment configuration file for each control unit, using either the GUI or a plain-text file. See Appendix B for formatting. Each will need a treatment name (e.g. ‘Treatment A’), and relay mapping indices. Sensor mapping indices are not required if the naming scheme of the sensor headings includes an identical treatment name (e.g. ‘Treatment A’ and ‘Treatment A pH’.
7. Set all relevant solenoid switches from ‘Off’ to ‘Auto’.
8. Schedule the configuration for training/calibration. This will initialize the controller in on-off mode, and run through several cycles to empirically validate reaction and dilution rates.
9. Once this process is complete, you will be prompted to confirm that the manual and automatic parameters agree.
10. The program will continue with bump and frequency domain tests to parameterize the PID controller gain. The duration will depend on the response time of the system, and the complexity of the reference series. Simple series or single set points should take no more than a few hours. Longer natural series will run through a representative signal spectrum, which may take up to 24 hours.
11. After the test, the experimental unit will be transferred to the holding queue, where it will be allowed to reach a predetermined equilibrium point, which will also be the start conditions of the experiment. At this point, animals or samples should be added.
12. Move the experiment to the active cue. This will start an acclimation period if the configuration includes one. Otherwise, the controller will start following the reference series or set point.



That's pretty much all you need to get started building your own microcosm research facility. Enjoy!