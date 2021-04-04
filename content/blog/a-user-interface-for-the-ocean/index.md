---
title: A user interface for the ocean
date: "2021-03-07T14:00:00.000Z"
description: |
    Some thoughts on how to make great user experiences for people that like to get shit done
    and not be distracted by poor performance and interface problems in ocean data tools. 
    
tags: ["ux", "design", "graphs", "visualization", "wip"]
---

Some user interfaces follow good design practices, but don’t “do work”, or they address the same need as simpler alternatives. Sometimes they are just hard to explore, require multiple forms to access, have no documentation, scatter buttons everywhere, or are unusable on modest devices and networks.

I’m going to talk about what is dragging these down, and what features are really, really required for marine spatial planning tools. Take for example, this list of features from a NOAA review of aquaculture siting tools circa 2017, in descending order of frequency:

| Feature                 | Frequency |
| ----------------------- | --------- |
| Orthoimagery            | Most      |
| Toggle layers           | Most      |
| Basemaps                | Most      |
| Print map               | Most      |
| Measure length and area | Many      |
| Clickable attributes    | Many      |
| Return to home          | Many      |
| Cursor coordinates      | Many      |
| Nautical charts         | Few       |
| User guide              | Few       |
| Overview map            | Few       |
| Full screen             | Few       |
| Share link              | Few       |
| Import data             | Few       |
| Draw point              | Few       |
| Filter                  | Few       |
| Buffer point            | Few       |
| Query                   | Few       |
| Generate report         | Few       |
| Export data             | Few       |
| Draw polygon            | Few       |

Most have orthoimagery (aerial/satellite) and basemaps, because these are enabled by default in web mapping applications. Other features like charts, printable maps, and reports are focused on replicating existing processes. I would say this is true also of many of the measurement capabilities. All the hard stuff (aka features that “do work”) you have to DIY, so there are few implementations.

Skeuomorphism is when the design of the digital version mimics the physical objects. This is more generally true of processes, like site planning manually on nautical charts. For a long time these tools were being pushed as enhancements to paper business processes. The important distinction today is that the tool is the process. Remember printing out Mapquest maps? Today you can start a business in under an hour, probably entirely through a voice assistant.

We want to bring that to marine permitting and incident reporting, among all the other business processes that touch the ocean. People love maps, and interactive games. So why can’t it be fun? Like, actually pleasant and efficient, while (importantly) respecting your security culture, agency, and ability.

For marine sciences, we talk about time series plots, profiles, maps, grids, triangular networks, etc. For machine learning we talk more generally about dimensions, matrices, tensors, and series. Start to include jargon from the GIS world, and things get confusing.

So, let me start with clarification of problematic terminology:

- Graphs are data structures; a plot/figure is not a graph, except that it literally is
- Visualization means computer graphics from 3D to pie charts
- Layers are collections of features in GIS, or collections of neurons in machine learning

Data can be described as existing in normalized n-dimensional space. Essentially, all data are points/vectors and relationships. The specific axes are not important, nor is the scale. For our software it all ends up as 8-bit integers anyway. This is all about how you transfer knowledge to people who are exploring complex arrangements of data and metadata.

On-boarding that lasts beyond the first session and doesn’t involve a human is where it starts. This is about building trust, providing value, and getting feedback. Start positive. See how much you can determine from the metadata, and ask clear questions to move the new user through the process.

Adding interaction delays gives time for asynchronous data fetching so that hot fresh visualizations are always ready by the time we’re through the process. There should also be shortcuts for the impatient.

We care about intent, location, and time—in that order.

What can I help you with? Knowing intent first can help narrow the search, or skip unnecessary prompts. It determines how data will be presented. As soon as they answer this question, we can start fetching personalized data and assets:

- “I’ll be on the water ⛴️” → `{ navigation() }`
- “I’m operating a business 💵” → `{ planning() }`
- “I want to see the big picture 🛰️” → `{ synoptic() }`

Where to? This is next because that is we chunk data spatially, so we have to know to start fetching. Location can be determined from metadata, but maybe that person is looking for information about someplace else. We can fetch spatial data as this is answered:

- “Someplace new! 🗺️” →  `{ prompt() }`
- “Bring me home 🏠” → `{ preferred() | request() | prompt() }`

Can you help narrow that down? Specific time queries can be made from the interface. This prompt determines which services are called initially to populate the client view:

- “I’m wondering about tomorrow 🧞‍♀️ ” → `{ predict() }`
- “I’m still thinking about yesterday ⌚ ” → `{ archive() }`

The program should do most things automatically, unless the user wants to take back control. The goal is to anticipate need and redirect to those resources, while transferring control progressively. It more important for the user to experience confidence building than it is to "integrity constraint" them to death. Recommending standardized names for common things is good. Infallible auto-correct is bad. Training and guidance offered all at once are overwhelming. But if you’re shifting left on security like you should be, you can use role-based authorization (RBAC) and extend new features and tutorials individually to users as their system privileges advance.

Control points should be neatly stored. Meaning available, and hidden not buried. Three levels max, prefer two. The first is visible, the second is visible on hover/click, and successive levels are one press/click away. This is a bit complicated when the “level” is a continuous concept like “z-index” or “zoom”, or an ordered array of however-many layers. The CSS z-index engine runs on groupings of elements by “context”. This is an implicit form of layer groups from graphic design tools, which is presumably where desktop GIS software got it’s inspiration.

All visual design is layering, more so the interaction of layers. The user is probably not a designer or engineer, but you might be, and your service should do the work to infer and surface relevant information in a focused, nay curated, way. So, while we’re navigating a X,Y,Z,T domain, were also doing some magic to assign value to information based on what we’ve learned by asking, what we’ve seen from previous interaction, what the user is looking at right now, and the relationships implicit in the data.

The most obvious mode of control is mouse/touch events. This is intuitive, precisely because it is skeuomorphic. It is also an imperfect proxy for user attention. Well designed and Accessible web applications should also be usable entirely through the keyboard. If a keyboard can do it, voice can do it also.

Mouse event are implicitly contextual. We hook them up to some React visualization components which use different rendering engines. These project multidimensional data into 2D images. Images change at 60Hz, so you get +1D for free. Without fancy optics or virtual reality that’s all you can get. The magic is projection. You can make as many materialized views as you want, your challenge is to make interaction intuitive across all of them.

We use Mapbox GL JS, so we get saddled with:

- left/single drag → pan (also arrow keys)
- right/double drag → rotate, azimuth & heading (also shift + arrow keys)
- two-fingers/scroll → zoom, continuous
- double left-click → zoom in, step (also shift + “+”)
- double right-click → zoom out, step (also shift + “-”)
- click and drag → zoom to extent

Oh no, drag actions are consumed by pan, rotate, and zoom interfaces! Also, I’m not convinced discrete zoom is so useful that it justifies 4 control sockets.  You can have unpressed mouse movement and mouse presses, so you use some combination of feature popups and inputs to change cursor context. We want to minimize the amount of control points available based on zoom, selection, domain, and user history. If you do this with menus then the either the menu changes when context changes, or inputs are “greyed” out.

You are allowed to be opinionated also! Let’s overwrite the functions so that this is true for mouse/touch events:

- left/single drag → pan (also arrow keys)
- two-fingers/scroll → zoom, continuous

With a depth of two or three actions, we can still show basic info on hover, go deeper on focus/press, and do feature-specific actions on drag. We lose 3D views, and and non-north up views, plus discrete zoom steps. Except we only lose these on mobile, because there are keyboard options for them! And we can script them, if we really, absolutely must show 3D data inside Mapbox.

What do people want to do when they gesture at a screen? Find information about points, lines, shapes, and volumes. A non-exhaustive list of measurement and aggregation queries:

- How far is X?
- How big is region Y?
- How often is X in region Y?
- How much X is in region Y?
- When is X in region Y?
- Where along the line AB is X?
- When along the trajectory AB is X?
- What is X at the point Y?
- When is X at the point Y?

There are types of queries associated with specific spatiotemporal aggregations. Spatial objects can be extended +1D by adding time. Spatial primitives are points, lines, and polygons. Except in rare cases, volumes are extruded shapes.

- point + time → series or trajectory
- polygon + time → volume
- volume + time → hypercube
- line + time → polygon

We don’t need to be super formal about it. Just remember time can be added after a spatial coverage to get higher dimensional structures. We can reach arbitrarily complex aggregations by combining primitives of different dimensions, but these must all be derived from a single gesture (click and drag). Some relationships may only be obvious in topological space rather than physical space. Mapping those relationships into real space is probably ugly, like flight paths but less sensible. But we can do it dimensionless!

We’ve liberated drag semantics, but how do we use it judiciously without overloading? People aren’t drawing for fun, and if they are they should use a different tool. The same actions are taken over and over, and are mathematical. So we give ourselves this rule: **dragging creates shapes and relationships**.

It all starts with an anchor point. Dragging from the anchor samples new points until the mouse is released. That gesture is encoded as a binary mask, heat map, or vector of coordinates. The sampling happens after a small threshold (screen) distance so that single points can be created without accidentally making more complex shapes. The difficulty is in distinguishing shapes and points. When do you close a path to create a polygon? When can a straight path be simplified to two points? How do you handle events that overlap with features? Do you allow arbitrarily complex paths? Do you allow templates and editing? Can you use existing anchor points to start new shapes? Isn’t this just CAD?

We can do some abstraction and user direction to infer theses cases. A rectangle is the bounding box of a line, which has 2 points. A circle is a buffer about a point. A line is the final simplification of an arbitrary path, which may have 2 or more points. A polygon is a path with more than 2 points, which has the same point as its start and end. From this we can prompt the user to mutate it into a functional shape or volume (e.g. through extrusion). The coverage of the resulting shape can be communicating interactively by drawing the true path as it is created, along with a bounding rectangle and a chord from the start to the current position.

The minimum feedback during and after a draw action is:

- cursor coordinates
- bounding box dimensions and diagonal
- enclosed area/volume
- total distance of path

Our system is all about relationships, things, and locations. When gestures are complete we can infer the type of relationship between different entities from the domain model schema following the SensorThings API standard, and ask for the user to confirm the transaction.

The interface is as a composable as the entity topology allows. While you may not want to tie your presentation to literally to your data structure, it helps push logic to either end of the pipeline while maintaining a nice internal consistency. You accrue metadata as you work. You are exploring data but want to keep an eye on real-time data from a sensor. The component containing the relevant data streams could be a pinned map popup, or pulled out of the popup into a floating or anchored component. But not a dashboard. Never a dashboard.
