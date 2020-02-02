---
title: Acceleration
date: "2017-08-17T12:00:00.000Z"
description: |
    Strategies for making faster Python code from parallelization to JIT to GPUs and whatnot. Sometimes people
    say languages are slow, but they're just not being creative enough. 
    
tags: ["python", "distributed computing", "parallel", "gpu"]
---


Python is a dynamically typed, interpreted scripting language. 
Out of the box, this can be slower, but that is easy to overcome. 
You can do more with less code, programming in high level languages is faster. 
Since the installation of the interpretor handles machineand operating system dependencies and quirks, you can write code once that will run anywhere. 
The computational bits can also be refactored into lower level languages like Fortran and C. 

## Just-in-time compilation

Numba does just-in-time (JIT) compiling on Python code to make it as fast as native C in many cases. 
This approach is good for pieces of code that run repetitively. 

## Parallel computing

There a several ways to accelerate code.
This accomplished through parallelization in shared or distributed memory setting. 
Graphical processing units (GPUs) can accelerate jobs further. 
At the application layer, methods are encapsulated so that they can be executed as a batch of jobs across the processors on one or more machines

### Message passing

Python uses processor parallelism instead of thread parallelism. 
When processes need to communicate, they use Message Passing Interface (MPI). 
Use the common C Pi example to see if MPI is installed:

```bash
mpicc call-procs.c -o call-procs -lm
mpicc C_PI.c -o C_PI -lm
mpicc MPI_08_b.c -o MPI_08_b.c -lm
mpiexec -n 1 call-procs
```

This will need to be working before Python bindings to MPI will work. 


# Distributed computing

When parallelism expands outside of a single machine or hsared-memory space, we start calling it distributed computing. 
For Python, [this](https://eli.thegreenplace.net/2012/01/24/distributed-computing-in-python-with-multiprocessing/) is a better description than I can come up with off the cuff. 
There are [two approaches to distributed computing](https://blog.computes.com/distributed-computed-centralized-vs-decentralized-c1d21202bde8): centralized and decentralized. 
Centralized is simpler, and will be discussed here. 
For ecological simulations, there will generally be some kind of controller that schedules the various tasks needed during each time step. 

## Example pattern

Say you are calculating particle trajectories, and have a NetCDF output from FVCOM, but it doesn't include dispersal terms for whatever reason. 
The initial process is a job server/manager, which distributes work across machines and processes. 
The manager would do mesh partitioning, and hand off topology to the other machines. 
Time loops are handled by the server processes, which use asynchronous communication. 
Each job is for a single node in a mesh. 
The processes take initialization info, then wait for a forcing message. 
They take a integration step for each message, and report back the state variables.

For each time step, the machines would request a JSON of physical fields from the manager, and load it into memory. 
Then divide node/volume calculations among available processes. 
Once all the field calculations are complete, then you'd setup a particle queue, and have multiple processors do interpolation and advection until all particles are in the update queue. 
A particle leaving the local domain would go to a transfer queue, to be sent to another machine. 
Basically, the serial program needs to be broken down into a process manager, and self-contained kernels that have limited dependencies.

For program "Happiest particle", if we assume that a particle can never jump onto land, the procedures might be something like,

```
def A(array):
	"""Make some calculations across all nodes"""
	result = fcn(array)
	return result

def B(position, topology):
	"""Get interpolated value at position"""
	result = []
	for node in topology:
		result[node] = fcn(array, topology)
	return result

def C(positions, velocities, stage):
	"""Runge-kutta integration"""
	positions += velocities * fcn(stage)
	
def D(array): 
	"""find maximum"""
```

The psuedocode for the simulation loop would look something like,

```
Setup()
While(True):
    Map A(A) > processes
    collect results
    
    Map B > machines > processes
    collect results
    
    for step in integration:
    	Map C > machines > processes
    	collect results
    	transfer particles
    	
    	Map B > machines > processes
    	collect results
    
    Map D > processes > reduce > alert
    if (condition): 
    	print("All particles are ecstatic!")
    	break
    	
Output()
Exit()
```

What you really want is a [Docker swarm](https://docs.docker.com/engine/swarm/) to manage all that for you. 
Or more likely, Kubernetes. The idea being there is one "server" per processor, which acts as an addressable virtual machine. 
This does away with machine/processor distinction.

## Python frameworks

### Job Stream

Job stream can also distribute jobs across hybrid clusters:

```bash
CPLUS_INCLUDE_PATH=~/berryconda3/envs/oceanics/bin/boost pip\ install job_stream
LD_LIBRARY_PATH=~/my/path/to/boost/stage/lib/ \
pip install job_stream
```

Job stream uses the Boost library, which can cause some installation challenges. 

### Ray

Another option is Ray:

```bash
sudo apt-get install -y cmake pkg-config build-essential autoconf curl libtool unzip flex bison python
pip install cython
conda install libgcc
pip install git+https://github.com/ray-project/ray.git#subdirectory=python
```

# Compute shaders

The GPU can act as an additional worker. 
Programming for the GPU is accomplished with compute shaders, which replace the traditional rendering pipeline. 

There on instructions online for [optimizing the Videocore GPU](https://petewarden.com/2014/08/07/how-to-optimize-raspberry-pi-code-using-its-gpu/) in Raspberry Pi, 
but it's probably not worth the effort. 

[Arrayfire](https://github.com/arrayfire/arrayfire-python/wiki) is an open source optimizer for CUDA and [OpenCL](https://www.khronos.org/opencl/) on GPUs and CPUs, 
that has extensions for Fortran and Python. On MacOS, there is an installer package. 
After this has been dowloaded and executed, the Python package can be installed with:

```bash
pip install arrayfire line_profiler memory_profiler objgraph numba
```

The basic array creation functions and types are in arrayfire.data. 