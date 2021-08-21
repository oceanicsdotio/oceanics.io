---
title: Graphics and rendering
date: "2020-02-10T12:00:00.000Z"
description: "Notes on implementing computer graphics pipelines"
tags: ["rendering", "shaders", "webgl", "vulkan", "visualization"]
---


Since the intended use is rather specific, I chose to implement visualization methods with shaders. 
The shader language (GLSL) is component of the Khronos Group OpenGL library. 

I originally learned computer graphics using the OpenGL fixed rendering pipeline,
called from a mash-up of C and C++. Those methods still work after 10 years,
but are dated.

Modern graphics libraries use GPUs to accelerate visual computing, and reduce energy consumption and heat production. 
The rendering pipeline consists of:
* vertex specification 
* processing/post-processing
* primitive assembly
* rasterization
* fragment shading. 

Specification supplies data arrays containing positions and properties, along with primitives that tell the GPU how to group the vertices.
This can be a vertex array object (VAO), which cannot be shared between contexts (e.g. windows).
The VAO must be bound. You can also supply a vertex buffer object (VBO).

Processing consists of a programmable vertex shader, which describes the visual properties of each supplied vertex. 
After this is an optional tessellation step. 
The vertex stream is used to create additional vertices. 
This could be used to draw parametric curves, or to build a circle from a supplied point. 

Next comes the option geometry shader, which processes the primitives and can create new primitives. 
This could be used for layered rendering, or creating higher-resolution buffers. 

There are more advanced technologies, but they are system specific. 

Vulkan is the new Khronos standard, developed from AMD’s Mantle API. 
It is a cross-platform system built for high-performance 3D graphics and computing. 
It is faster than OpenGL, with native parallelization. 

Vulkan APIs exist for common languages: Python, Java, C/C++. 

MacOS does not automatically support Vulkan, but similar capabilities are available through Apple’s Metal framework. 

Khronos also maintains OpenCL, which is a C-variant for hybrid computing environments which include CPUs, GPUs, and field-programmable gate arrays (FPGA). 
CUDA is similiar, but is only supported on NVIDIA hardware and x86 CPUs. 
OpenACC also enables parallel execution across hybrid platforms, while OpenMPI is available for clusters which used shared memory. 

I'm actively working on some things in this area now, and will try to update here when I can.