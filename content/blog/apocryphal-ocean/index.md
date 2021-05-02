---
title: Apocryphal ocean
date: "2021-05-02T07:00:00.000Z"
description: |
    We've written about dimensionless data before. This is the transcript of a talk on that topic and others. If you've ever wondered why ocean climate data seem intentionally inaccessible, this may be for you. 

tags: ["data", "ocean", "graph", "geospatial", "cybernetics", "nasa", "climate", "sci-fi", "music", "art"]
---


## TLDR (2:40)

The National Aeronautics and Space Administration (NASA) Jet Propulsion Lab (JPL), specifically the Physical Oceanography Distributed Active Archive Center (PODAAC) wants to know how to access, analyze, and visualize signature assets.

I am going propose and justify web components (by which I mean services, workers, databases, applications) which enable consumers and processors to extract spatial subset(s) from these data, and build on demand time series and derived products.

You might not believe it at first.

There won’t be system diagrams or performance benchmarks. Smarter folks have published digital reams on the subject of (hyper)cubes and efficient access to multi-dimensional data.

But the creators of some of the longest [continuously operating data acquisition](https://www.technologyreview.com/2015/08/06/166822/what-is-the-oldest-computer-program-still-in-use/) software asked for the best way to use the web to deliver these capabilities.

JPL engineers remotely diagnosed and patched Voyager in flight, on hardware with 70kb memory, when the computers started talking gibberish due to a single bit flip 33 years into the 48 year mission.

I can’t do that! Can I?

Didn’t Reed-Solomon, Galois fields, and RAID come from those projects?

It’s humbling to say, as always, that “best” depends on your use case, volume, budget, and charter.

Let’s get to it!

- If you’re a service provider, write cloud native functions that access objects
- If you’re a banker or risk professional, pay the Scala premium
- If you’re an artificial intelligence platform, build a vertex graph with spatial partitions
- Else ship platform-independent assembly that produces data

The important part is thinking about how you want technology to drive your business outcomes in advance.

There’s just a ton of hard work to do before any code is written for the perfect future-proofed, warehouse-mart-lake-archive-repo-database.

## No truer words than when spoken (1:45)

Sometimes I use non-canonical terminology to reduce ambiguity, or to indicate that I mean a specific facet of a thing rather than the whole.

I try to use the word that means the thing rather than an alias.

Since this is meant to be spoken aloud. I’ll pause for clarifications so we can build a foundation as we go.  

Underlined phrases are emphasized. Emoji are just for fun. 🦩

And, I won’t laugh unless y’all are in on the joke.

One time a lot of smart people thought it was exceptionally funny that I didn’t know what turgid meant.

Joke is, maybe I did... Hold-up, you lied? *Maybe*.

I’m just a message-passing object with memory after all. *Maybe* I was remote sensing through performance. I’m dancing inside a mutually-observing system right now. 💃

"Ultimately, ______ art means honestly expressing yourself
...it is easy for me to put on a show and be cocky
Or I could show you some really fancy movement
But to express oneself honestly, not lying to oneself
And to express myself honestly
Now that, my friend, is very hard to do."

This is from Bruce Lee’s “Lost Interview”, sampled in Honest Expression, by Binary Star, on the acclaimed Masters of the Universe (2000), a re-mix of Waterworld (1999) which was made with $500 by a duo that met in a Michigan prison.

There’s a lesson here.

By the way, if the references to music and science fiction and space mysticism get to be like A LOT...

JPL co-founder Jack Parsons was publicly an occultist and recited the “Hymn to Pan” during rocket tests. 🚀🐐

## The premise is trust (8:13)

The key to making use of (dis)connected data, is to put it in context.

That requires developing a lingua franca for humans and machines. Let’s start by ensuring we’re on the same page.

______________, do you think there such thing as one-dimensional ocean data? 🎙️

A single observation, without a location or timestamp is of very little utility. This observation is probably a view into a time series or a spatial collection.

For an isolated system, like a sensor in a seawater or fuel tank, you can fib and say “it doesn't have spatial dimensions”. Just time and whatever observed property you're measuring. Two-dimensional.

You can do the same fiction for any thing that doesn't move. A tide gauge, a box model, a buoy, a weather station.  

But as a system, these don't make sense without space and time. Things move, and if your schema assumes a fixed location, you prevent or complicate a whole line of services people would be happy to pay for.

_______________, how did I say I felt about working with non-spatial data? 🎙️

I’d like to updated my answer.

All data are static, spatiotemporal graphs. 🙄

Specifically, contextualized data have spatial and time dimensions, and relationships to other data. No need here for arcane incantations of the third-normal form. 😱

Data do not change, and if they do it is because “the truth” changed. How you design for that says a lot about you.

That’s why I’m going to talk about it!

Synthesizing data is sometimes called sensor fusion in terms of the mathematics, or increasing the data readiness level in terms of the process (Lawrence 2017).

I prefer synthesis, because it acknowledges that we inject fiction (“models”) to increase the utility to the end user.

We invent semantics like "port forward fuel level sender" to refer to a precise location w.r.t. your Lagrangian reference frame.

When the reference or observed thing moves, we get a trajectory, which probably has at least four dimensions. Like a fish, boat, or πλαγκτός.

What we call 2-D (a gray-scale image) is 3-D: X,Y,Z.

For example, a wave height field, sea surface temperature, or as we’ll look at in more detail: centimeters of equivalent water based on “gravity sensing” satellites.

What we call 3-D like a point cloud, mesh, or volume rendering, is at least 5-D when animated, and a graph is a particular projection of a sparse matrix.

The examples of observed properties are kind of contrived, because the true phenomena of interest are not fully captured.

Waves need frequency domain data, temperature varies with depth, and the water depth values come with many caveats.

It's bytes representing some few measurements.

This becomes more evident when you get into the first principles of digitized voltages or photon counts.

Sometimes the proxy is derived from two, three, or more primary or derived properties.

When it comes down to it, we are doing pixel manipulation on discrete and reduced array representations of higher-order data or models.

____________, what is a model? 🎙️

Ask some modellers and you will get that many answers:

- finite element mesh on which the numerical kernels run
- input data that represents what we believe to be truth
- fiction we encode in the source code
- the compiled binaries that actually run
- output produced by the action of running the kernel on the inputs and mesh
- whole system of data and assembly
- statistics
- neural networks

To me, it’s a magic trick that extracts knowledge from raw data and reduces uncertainty.

We create apocrypha, which are treated as can(n)on.

To make data useful to the public, we perform destructive actions.

Some actions are invisible, such as rounding and truncation errors and binning which over many iterations have economic and climate justice implications.

Unless you are the producer, there is very little hope of acquiring the original data and methods that went into transforming it.

It is often impossible to reverse engineer or reproduce the science. Only to appeal to authority.

Who should get to decide which interface encodes that hysteresis? 🎙️

Back-tracing (decoding) models is a really interesting topic.

It’s “just” reversing a physics-derived hash with deep neural nets, and I “only” need $10M, a team from “MIT and Stanford” and about 5 years.

Trust me. I’m *the* expert. 🤣

We have to trust that everyone in the pipeline is trained, awake, good-willed, and alert that day:

- “Human error…”, why an engineering control called a blowout preventer didn’t
- “Our algorithms function perfectly, but…”, federal agency on the timeless law of 🚮-in-🚮-out
- “Our code is correct…”,  researchers setting an entire bio-region back >500K person-hours, disk capacity worth $20K/month, and >10K supercomputer hours.

To me it feels like dead code and black boxes: digital gate-keeping. I’ve felt like this for 13 years, and been told it was my effort and ability that was the problem.

So, I taught myself “software engineering” through linear algebra in MATLAB, computer graphics in C++, and simulations in FORTRAN77.

Being unable to find someone to help understand hard technical things felt terrible. Worse when you realize that it’s because they can’t or won’t, but insist it’s easy. Say for example, compiling and linking the NetCDF Fortran library.

At the time, entire departments existed to manage compute environments.

The ecosystem was so cumbersome that I avoided it entirely by focusing on kernel development.

Today I can spin up a distributed supercomputer in a few minutes that will run anything I can imagine and afford.

It works the same way every time, except when it doesn’t, and then it self-heals.

This is not because I am particularly good. It is because I use automated infrastructure built by smart people that enables me to do work that took a team of five in 2008.

Innovation is a often signal of frustration by folks who wish into existence technology to accomplish certain tasks and express themselves inside a larger mission or organization, because they have trouble accessing support.

When we focus on frameworks, cloud providers, languages, libraries, and even standards we limit their possibilities.

Reiterating my earlier point: the model is everything, organizations and individuals included.

Infrastructure as code means code is infrastructure. Source, infrastructure, binaries, artifacts, and “data” are *Data*. Big-D data, not Big Data.

Observable all the way down, so mote it be.

When that is so, communities of practice will align around brands and products, because they comprehend the ways in which their contributions drive desirable outcomes for themselves, the org, the community, and the planet.

That’s my premise, but maybe I spent too much time around Berkeley…

So, let’s get Pacific 🌇.

## First date jitters (3:16)

I like to document my first date with new data and providers.

This is as far most people will get. One (1) chance to make an impression. I’m “reasonable”, so I will “allow” you five (5). 💅

I mean, Tellus is a mom and provider, keeps livestock, and seems to like lounging in the woods with guys into ~~astrology~~ astronomy. #goddess

![It’s Art! It’s also Tiles.](https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Aion_mosaic_Glyptothek_Munich_W504.jpg/1920px-Aion_mosaic_Glyptothek_Munich_W504.jpg)

[https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Aion_mosaic_Glyptothek_Munich_W504.jpg/1920px-Aion_mosaic_Glyptothek_Munich_W504.jpg](https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Aion_mosaic_Glyptothek_Munich_W504.jpg/1920px-Aion_mosaic_Glyptothek_Munich_W504.jpg)

I arrive on the [mission page](https://grace.jpl.nasa.gov/mission/grace/). Looks slick. 😍

I learn GRACE stands for Gravity Recovery and Climate Experiment. It has a history of the project, some facts, and many links to external pages, even other catalogs.

Some links are broken. 💔

Fire up redundant systems and prepare for launch, 100% 🎙️

I instead search for the PODAAC site directly. The page I end up on suggests the mission is over. But I know there are newer data. Oh, `-FO` means follow on!

I’m still learning about missions not data. 💔

We are experiencing some unpredictable turbulence, 90% 🎙️

The datasets have digital object identifiers, which is great. Plus citations and cross-referencing. Even better, it’s a graph! 😍

Still, finding the right data set out of 109 variants is not easy, and the search is only by exact string matching. I try three times before I find the asset I want. 💔💔

Control, our navigation computer is acting up, 80% 🎙️

When I try the first download option I learn drive and language tools are private. Just sign up? That’s moving a little fast don’t you think? Do you salt passwords? Where does SSL terminate? The running list of my leaked personal data is *very* long.  💔

We’re getting cross chatter on our designated frequency, 70% 🎙️

We make some more Smalltalk about ASCII metadata and stories, before I commit and download the 800MB NetCDF. This takes ~3 minutes. I’m actually not sure how long, because I get bored and start looking my phone. Recommended [time-to-interactive](https://web.dev/interactive/) is 2.2 seconds. 💔

Controls are sluggish, maybe we should abort the mission, 60%🎙️

“If you wannabe my lover, you gotta get with my friends…” including UCAR, HDF, USAF, Java, Python, BLAS, LAPACK. I could’ve spoken to Tellus via THREDDS, but then I have to XML. 💔

Your analogy is breaking down, 50%🎙️

So let’s stop!

I picked N=5 because that is when I got bored, and retroactively applied a restriction. I can make myself be not bored, but let’s be honest about average user patience.

It’s also one less than the number of you, and equal to the members of Spice Girls.

Why the Spice Girls (1994)?

Allow me to deflect by asking the question posed by content creator Brianne Fleming.

What can the Spice Girls “teach us about brand purpose”? 🎙️

![https://briannefleming.com/wp-content/uploads/2021/01/Spice-Girls-1000x675.jpg](https://briannefleming.com/wp-content/uploads/2021/01/Spice-Girls-1000x675.jpg)

## We’re getting to a point, I think (9:07)

The Tellus asset I am talking about is `TELLUS_GRAC-GRFO_MASCON_CRI_GRID_RL06_V2.nc`.

Data are stored in NetCDF, and the files can be remote mounted or downloaded.

NetCDF is built over the hierarchical data format, and implements fixed chunking to optimize query performance for time slicing (usually).

Units are equivalent water thickness (cm), the coverage is global with 30 arc minute “grid”, and a one month sample period from April 2002 to the present.

There is a complimentary land mask, which can be used to extract either land or water features.

Here are some of the gotchas:

- Despite assertions, not a true “grid”, pixels are element-wise and offset from Null Island 🏝️
- Only sort of static until mission is over
- Chunking makes single pixel time series the worst case performance
- Have to read the metadata to know array offsets, endianness, and index order

I’ve had the pleasure of implementing performance-critical services and libraries to access similar data four or five times, and I don’t feel great about the results.

There weren’t technical mistakes, so much as social constraints that I didn’t quite grok at the time, or that I couldn’t negotiate.

Aquaculture research was producing derived temperature and color data from Landsat, at 30m resolution using MATLAB.

I extracted the kernel that performed AVHRR and Landsat regressions and sensor fusion, and re-implemented the manual pipeline with `numpy` and `docker`.

Oh hey `fortran`, I didn’t see you hiding under that `numpy`.

It was hacky academic data science code that did file sync from file transfer protocol and remote mounted NetCDF.

Servers, file systems.

What are database indices and partitions? Can I “just” use `timescaledb` and `rasdaman`? 👶

But I got a few things right!

- Kubernetes was just *becoming,* but declarative infrastructure made a lot of sense
- I took array chunking seriously
- I used lazy task tree execution

Here’s a sketch of `satcdf`:

- `Python → FTP → NetCDF → Numpy → Rasdaman?`

Passed the project on to my successor and never heard anything back.

I had a successor, because I was hired as the first engineer at a venture capital backed stealth startup. I thought I knew what I was getting into. 😅

I like regulated markets, because quality control matters and security is taken seriously.

How do you do billion-row searches and reductions on event-sourced data to build spatiotemporally-aware debt portfolios with zero accounting errors…

Parquet, and auto-scaling infrastructure in the shape of `compliance-guard`:

- `Python API → Postgres → GKE → Parquet → S3 → Python API → React`

Am I a full stack Silicon Valley engineer yet? I can has FAANG? 🧛 What about PARC? 🙂

But OceanTech is taking off, and I do both those things!

You want me to take public data and improve it 8% with sensor fusion and machine learning and sell it at a premium? So cool! 😊

You want redundant stores of all data ever produced from the *tape archives* of multiple space consortia? Sounds expensive, let’s do it with `STAC` and `COG`! 🙂

Next week please, in Java, and don’t worry about review or tests. We have two APIs and four guerilla visualization projects, none are stable or documented. 😑

Okay! Here’s a  `heads-up`:

- `NetCDF/GRB → RabbitMQ → EKS → PostGIS → Python → Apollo → React → MapBox`

These examples are more complex than the directed acyclic graph I choose to show. Sometimes cyclic and bidirectional. The closer you fly to the Sun the more stuff there is. 🥵

Icarus is not me, only a metaphor. Dude just wanted out of prison. Probably would’ve helped to have altitude κυβερνάω and a 3-axis Honeywell magnetometer.

![The Louvre!](https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Fall_of_Icarus_Blondel_decoration_Louvre_INV2624.jpg/1280px-Fall_of_Icarus_Blondel_decoration_Louvre_INV2624.jpg)

[https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Fall_of_Icarus_Blondel_decoration_Louvre_INV2624.jpg/1280px-Fall_of_Icarus_Blondel_decoration_Louvre_INV2624.jpg](https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Fall_of_Icarus_Blondel_decoration_Louvre_INV2624.jpg/1280px-Fall_of_Icarus_Blondel_decoration_Louvre_INV2624.jpg)

That’s OK, i.f.f. you can internalize all of the complexity, without making it inscrutable. But you ought not way-find for great ships unless you can propagate errors through the whole system.

There’s no amount of click-wrap that can protect you from tort in the event of an *Ever Given*.

There is no secret to moving away from complexity. You just decide to keep it simplex, fast, and cheap and evaluate what you really, really want. 🌶️👧

The pattern I go to for unstructured vector data at `oceanics.io` is:

- `NetCDF → Lambda → Vertex Buffers → S3 → Neo4j → Lambda → WASM Worker → React → MapBox`

## The data must flow (10:52)

This is a well loved asset and there is a ton of prior art. One-off “3-D” visualization goes [back to 2003](http://ttps://grace.jpl.nasa.gov/resources/6/grace-global-gravity-animation/) and [to 2013is](https://earth.gsfc.nasa.gov/geo/data/nasagsfc-mascon-visualizations)h.

There are currently 2 web visualization and “analysis tools”. Both built for GRACE though they could be applied to any similar assets.

First, an [absolute classic OpenGL](https://grace.jpl.nasa.gov/resources/6/grace-global-gravity-animation/) fixed rendering pipeline artifact with Phong shading circa 2003.

The interesting part is that through with the magic of Dropbox, SEO metadata, and hash-based message authentication codes, it is visible while securely embedded in this document.

And it is vivid.

This [video](https://earth.gsfc.nasa.gov/geo/data/nasagsfc-mascon-visualizations) from the Goddard studio has aged less well:

In terms of interactive media, there is a [JPL hosted one](https://grace.jpl.nasa.gov/data-analysis-tool/) using `react`, Web Workers, and presumably `webgl` to render.

It’s looks good, is mostly bug free, and let’s people waste their own time picking the color of the bike shed.

University of Texas has a [Cesium-based version](http://www2.csr.utexas.edu/grace/RL06_Mascon_Viewer/Apps/index.php). Which does the same thing, but with a different engine and projection. `www2`, no `https`.

Based on how bogged down my browser gets, it’s loading and transforming on the main thread.

Hexagons are cool! But the only way you’re getting that is from lossy bi-linear sampling, that might change interpretation. The color map is problematic in terms of color blindness as well.

Yeah, I can nitpick with the best of ‘em. But I think these are amazing! They are *Lagniappe*, something extra.

Try inviting gov’t employees to tech events.

Most politely decline because they are way too busy, but 100% of those that do show have actionable ideas they think worth pursing in the private sector.

These agile developers and guerilla capacity planners are one of your most valuable resources, because they care enough to do it anyway, for “free”.

Their efforts are actually part of the total cost of ownership, though not accounted for.

It is apparent to me that internal orgs own parts of the GRACE process, and the goals of PODAAC are distinct from those of say UT, JPL, or NASA.

_____________, what would be a way that the Tellus legacy could become about spanning boundaries? 🎙️

Delivering visualization that is accessible and maintainable and beautiful, is a long road.

Even trying to mandate standards can distract from the core mission. Community standards crop up when tech starts to outpace standards orgs.

As a gov’t agency, you’re the solid foundation on which mountains of science are built.

It’s important to performance to maintain a continuous chain of custody, and you should focus on building up from the data.

But you don’t need to worry about web services right now.

Folks technical enough to be accessing your data (modelers) already have the network speed and computing means to analyze it.

Instead convene and consolidate under your project umbrella.

Your only mission is to get new people in your club, and to be welcoming to the robots 🤖

Following that, modular and progressive design will allow you to focus development on specific goals, and bundle services from multiple orgs.

Making the infrastructure lean and decoupled, and providing tools through the web (browser) will improve accessibility.

More agents will use it, and find novel applications. You can learn from this process, and ultimately provide better service, not to be confused with x-as-a-service.

What is the most frequent use case for these data in the ocean?

Subsea pressure sensor validation and calibration!

With offshore wind and blue economy activity, you’re going to have a lot more resource constrained edge devices asking for single pixels.

Like a million? Like a billion Voyagers, and they’re gonna wander all around!

I hope you are using a content distribution network.

The components that make up such a system might be:

- Cron job to checksum data sources
- Worker to process updates into S3
- S3 repository with CDN
- Optional metadata database for topology
- Durable queue
- Web worker for digitizing trajectories and array slicing
- Raster visual element
- Time series visual element

Caching is hard, and using CDNs and browsers as your runtime builds in a lot power.

Wait, the CDN is the runtime… oh no this is just… Yup, another Cargo cult rant about Rust and Web Assembly! 🕸️🦀📦

Nope, it doesn’t actually have to be Rust. It could be C++, or even Fortran to WASM! Though the latter falls into the realm of still-way-too-hard for me.

But wait there’s more!

You can put a NetCDF in S3 and read offsets directly from it! But only if you inspect the metadata once.

What if we unpack that data, move the metadata up to the browser API instead of file API, and cut out all the middle stuff?

We’re using public static data, so we don’t really, really need mutex, ACID, a queue, or a database.

I.f.f. we really, really want a queue, we can fallback to `postgres` pubsub and S3 notifications!

Even though my `redis` cluster makes me feel like an astronaut 👩‍🚀, it’s a vanity, and “no one ever got fired for choosing `postgres`”.

This is looks better:

- Managed S3
- Web Hook
- Web Worker
- Component

If only you could do 2D canvas in workers in Firefox. You can still output an ArrayBuffer, so it’s not a huge deal… but why is the web so weird? 🧞

So, we can fetch and process a bunch of data in parallel on the client, why would we want to?

Remember how I said that the JPL tool was great because it allowed people to choose their own colors?

Depending on your precision and range, RGBA images can encode 1-8 separate dimensions, in addition to implicit x, y.

The same is true for video, saved as a “file” or generated at runtime (computer graphics). Like GOES-16.

WASM, WebGL and GLSL are available in workers, and the graphics processing unit speaks “image data” fluently.

And if the client doesn’t support it, we can fallback on a polyfill in a cloud function. Or, an embedded device.

You fetch all of the assets and code needed to produce the ”data”.

Meaning you can re-parameterize, interactively, with feedback. You can dynamically patch the process in real-time, like Voyager.

The compiler catches most mistakes. And because WASM memory is contiguous, it is sand-boxed and safe. Meaning that data structures dynamically optimized for your chunk of data don’t need to be serialized. The binary is the payload and kernel.

It could be a trained statistical model that outputs some data which are close enough.

Don’t trust those pesky scientists down the hall? Put in your own assumptions!

You can push this to the logical extreme, and make an arbitrarily large DAG that accounts for all inputs, products, and methods.

Is this blockchain? I don’t know! But people like the BOINC team think so, and tied volunteer computing to crypto-tokens with monetary and collectible value.

To most people NASA is a [lifestyle brand](https://www.latimes.com/business/story/2019-07-19/nasa-logo-shirts-swimsuits-everything).

But what if every consumer wearing the NASA logo was also a node in your supercomputer, and contributed meaningfully to the scientific mission, knew they were doing so, and "bragged” about it on the Internet.

Our abstraction now encompasses the full system, while allowing for play.

Play and transparency is how we learn to build trust. It’s no longer about ”correctness”, it’s about being reproducible and scalable.

A happy side effect is that you have almost no compute costs, and storage costs around $60 per year.

Another happy side effect is that you won’t have collaborators publicly say “the updated climate down-scaling parameters made all our ecosystem projections wrong”. (April 23, 2021)

They will instead say “Oh wow, climate down-scaling parameters were updated last night, look at how X induces a positive feedback loop in wildfire frequency. Let’s see what can we do about it”.

## Thank you, questions?

This talk is partly inspired by music! It was the NASA page that inspired that, with their trivia references.

Specifically the songs [Honest Expression](https://www.youtube.com/watch?v=Cr0tntiFGM8) (2000) by Binary Star, and [Pentagram Constellation](https://www.youtube.com/watch?v=sHLPUa5Lq0Q) (1999) by Agoraphobic Nosebleed, which is in turn is inspired by the Canadian [cult film Cube](
https://www.youtube.com/watch?v=boDgkH7Yw-0) (1997), in which, like the story of Icarus and Daedalus, some mortals get in trouble because they built something too complex and didn’t trust each other. Cube 2: Hypercube was born the same year as GRACE (2002).
