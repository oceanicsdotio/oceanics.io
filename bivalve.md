
# Quickstart

The `neritics-bivalve` service interacts with `bathysphere-graph`. For full functionality it will need to be able to find an instance of the graph API on the local network, or the Internet. This search is performed automatically, based on search paths declared in `config/app.yml`.



**Requirements**

String formatting and asynchronous calls in the Python code requires `>=python3.6`. 

Your life will be much easier if you use `docker-compose` to build images. 



**Compile**

To compile the binaries with Mono:

 `mcs -reference:bin/ShellSIM.dll -out:bin/kernel.exe src/kernel.cs src/json.cs`

or use the script: 

`sh src/compile.sh`



**Test**

To test without graph dependencies:

`pytest -m "not graph"`



**Run**

To start up a local server (`gunicorn`):

`sh src/start.sh`

To run the docker container behind `nginx` :

`docker-compose up -d`

To run the docker container solo:

`docker run -p 127.0.0.1:5000:5000/tcp -it oceanicsdotio/neritics-bivalve:latest `





# Using the DLL

There are four public classes within this namespace:

* ShellSIM.Individual
* ShellSIM.Population
* ShellSIM.Sector
* ShellSIM.CultureArea

## Individual

### Start
```cs
public void StartSIM(
	int SpeciesIndex, 
	int Ploidy, 
	double BoxVolume, 
	double SeedSL, 
	double SeedTFW, 
	double SeedDTW, 
	double StandardDSTW, 
	int SpeedMode, 
	double DeltaTimeStep, 
	double PCRatio, 
	double N9 //Razor Clam CRatio
)
```

### Run
```
public void RunSIM(
	int Iteration, // The current timestep instance (Day)
	double Temperature, // Iteration Temperature (oC)
	double Salinity, // Iteration Salinity (o/oo)
	double AerialExposure, // Iteration Aerial Exposure (fraction of 24h)
	double CurrentSpeed, // Iteration Current Speed (cm/sec)
	double DissolvedOxygen, // Iteration Dissolved Oxygen (mg/l)
	double CHL, // Iteration Chlorophyll (µg/l)
	double POM, // Iteration Particulate Organic Matter (mg/l)
	double TPM, // Iteration Total Particulate Matter (mg/l)
	double POC // Iteration Particulate Organic Carbon (µg/l)
)
```
### Outputs
All outputs are also available from the population interface. 

#### Properties

name | description
--- | ---
DSTW | Dry Soft Tissue Weight 
ShellLengthCM | Shell Length (cm)
ShellLengthMM | Shell Length (mm)
TFW | Total Fresh Weight
DCI | Dry Condition Index
WCI | Wet Condition Index
DSTWIncrease | Soft Tissue Weight Increase

#### Cumulative environmental impact
name | description
--- | ---
CumCR | Clearance rate
CumFROC | Filtration of organic carbon
CumFRON | Filtration of organic nitrogen
CumFROP | Filtration of organic phosphorous
CumFRCHL | Filtration of chlorophyll 
CumFRREMORG | Filtration of secondary organics
CumFRPOM | Filtration of particulate organic matter (POM)
CumFRPIM | Filtration of particulate inorganic matter (PIM)
CumFRTPM | Filtration of total particulate matter (TPM)
CumNE | Nitrogen excretion
CumAL | Ammonium loss
CumTHL | Total aerobic and anaerobic heat losses
CumOV | Oxygen volume uptake
CumTFOC | Deposition of true faeces as organic carbon
CumTFON | Deposition of true faeces as organic nitrogen
CumTFOP | Deposition of true faeces as organic phosphorous
CumPFOC | Deposition of pseudofaeces as organic carbon
CumPFON | Deposition of pseudofaeces as organic nitrogen
CumPFOP | Deposition of pseudofaeces as organic phosphorous
CumTDPOM | Deposition of total biodeposits as POM
CumPFPOM | Deposition of pseudofaeces as POM
CumTFPOM | Deposition of true faeces as POM
CumTDTPM | Deposition of total biodeposits as TPM
CumPFTPM | Deposition of pseudofaeces as TPM
CumTFTPM | Deposition of true faeces as TPM

#### Weight-standardised rates

name | description
--- | ---
WSCR | Clearance rate
WSFRTPM | Filtration of total particulate matter
WSOM | Oxygen mass uptake
WSOV | Oxygen volume uptake
WSNE | Nitrogen excretion
WSAL | Ammonium loss
WSNEB | Net energy balance
WSDSG | Dry shell growth
WSWSG | Wet shell growth 
WSDSTG | Dry soft tissue growth 
WSDSTGD | Dry soft tissue growth per day 
WSWSTG | Wet soft tissue growth 
WSTFWG | TFW growth 
WSTFWGD | TFW growth per day 


## Population

### Start
```cs
public void StartSIM(
	int SpeciesIndex, // see table
	int Ploidy, // see table
	double BoxVolume, // Sector.SectorVolume (m3)
	double SeedSL, // shell length (cm)
	double SeedTFW, // total fresh weight (g)
	double SeedDTW, // dry tissue weight (g)
	double StandardDSTW, // dry weight for phsyiological rates (g)
	int SpeedMode, // see table
	double DeltaTimeStep, // time step
	double PCRatio, // Redfield ratio for phosphorous (0.009434)
	double NCRatio, // Redfield ratio for nitrogen (0.150943)
	double HarvestableSize // (g)
)
```


#### Aliases

index | SpeciesIndex | Ploidy | SpeedMode 
--- | --- | --- | ---
0 | Generic Shellfish Species | diploid | constant
1 | **Mytilus edulis (Blue Mussel) - default | meiosis I triploid | tidal average
2 | **Crassostrea gigas (Pacific Oyster)** | meiosis II triploid | time series
3 | ~~Chlamys farreri (Chinese Scallop)~~
4 | ~~Mytilus galloprovincialis (Mediterranean Mussel)~~
5 | ~~Perna canaliculus (Green Lipped Mussel)~~
6 | ~~Tapes phillipinarum (Manilla clam)~~
7 | ~~Tegillarca granosa (Muddy Bloody Clam)~~
8 | ~~Crassostrea plicatula (Chinese Oyster)~~
9 | ~~Sinanvacula constricta (Razor Clam)~~
10 | ~~Ostrea edulis (European Flat Oyster)~~
11 | ~~Pecten maximus (Great Scallop)~~
12 | ~~Modiolis modiolis (Horse Mussel)~~
13 | **Crassostrea virginica (Eastern Oyster)** *


#### Run
```
public void RunSIM(
	int Iteration, 
	double Temperature, 
	double Salinity, 
	double AerialExposure, 
	double CurrentSpeed, 
	double DissolvedOxygen, 
	double CHL, 
	double POM, 
	double TPM, 
	double POC, 
	int AnimalsSeededPerDay, // seeded per day with average total fresh weight in Class 1 for the current iteration
	double HarvestFraction, // Iteration Harvest Fraction (fraction)
	double MortalityOver0CM, // Mortality fraction of size n.
	double MortalityOver1CM, 
	double MortalityOver2CM, 
	double MortalityOver3CM, 
	double MortalityOver4CM, 
	double MortalityOver5CM
)
```

### Outputs


#### Population-only

name | description
--- | ---
AverageTFWC[N] | Mean total fresh weight in class
AverageDryShellWeightC[N] | Mean dry shell weight in class
AverageShellLengthC[N] | Mean shell length in class
AverageDSTWC[N] | Average dry soft tissue weight in class
TotalBiomassC[N] | Biomass in class
NumberAnimalsC[N] | Animals in class
TotalNumberAnimals | Animals in population
Harvest | Number of animals harvested
HarvestBiomass | Biomass of animals harvested
APP | Average physical product
CumNumberAnimalsSeeded | Cumulative number of animals seeded
CumNumberAnimalsHarvested | Cumulative number of animals harvested
TotalCarbonHarvested | Total C harvested from population
TotalNitrogenHarvested | Total N harvested from population
TotalPhosphorousHarvested | Total P harvested from population
NetChangeInTFWC[N] | Net change in total fresh weight in class
PredictionOfIndividualNetChangeInTFW | ShellSIM prediction of individual net change in total fresh weight

#### Density-dependent outputs

name | description
--- | ---
DDCR | Clearance rate
DDFROC | Filtration of organic carbon
DDFRON | Filtration of organic nitrogen
DDFROP | Filtration of organic phosphorous
DDFRCHL | Filtration of chlorophyll 
DDFRREM | Filtration of detrital organics
DDFRPOM | Filtration of particulate organic matter (POM)
DDFRPIM | Filtration of particulate inorganic matter (PIM)
DDFRTPM | Filtration of total particulate matter (TPM)
DDNE | Nitrogen excretion
DDAL | Ammonium loss
DDTHL | Total aerobic and anaerobic heat losses
DDOV | Oxygen volume uptake
DDTFOC | Deposition of true faeces as organic carbon
DDTFON | Deposition of true faeces as organic nitrogen
DDTFOP | Deposition of true faeces as organic phosphorous
DDPFOC | Deposition of pseudofaeces as organic carbon
DDPFON | Deposition of pseudofaeces as organic nitrogen
DDPFOP | Deposition of pseudofaeces as organic phosphorous
DDTDPOM | Deposition of total biodeposits as POM
DDPFPOM | Deposition of pseudofaeces as POM
DDTFPOM | Deposition of true faeces as POM
DDTDTPM | Deposition of total biodeposits as TPM
DDPFTPM | Deposition of pseudofaeces as TPM
DDTFTPM | Deposition of true faeces as TPM

## Growing area

### Methods
```
public void StartCultureArea(
	double AreaLength, // (m)
	double AreaWidth,  // (m)
	double AreaDepth, // (m)
	int SectorCount // number of sectors in culture area
) 
```


```
public void RunCultureAreaPre(
	int Iteration, // current timestep (Day)
	double CurrentSpeed // Iteration Current Speed (cm/sec)
)
```

There are no parameters for the CultureArea.RunCultureAreaPost method. This method is used for calculating resources available within the culture area and working out aggregates.

```
public void RunCultureAreaPost()
```

### Outputs

name | description
--- | ---
SectorCount | Number of sectors within culture area
AreaLength | Length of culture area
AreaWidth | Width of culture area
AreaDepth | Depth of culture area
TotalArea | Total volume of culture area
CurrentSpeed | Current speed through culture area
RateWaterFlow | The rate of water flow
SectorVolume | The volume of each sector within the culture area
RemainingCHL | Concentration of chlorophyll remaining after each iteration
AbsoluteChangeCHL | Absolute change in chlorophyll from first sector to last sector
FractionalChangeCHL | Fractional change in chlorophyll from first sector to last sector
RemainingPOM | Concentration of POM remaining after each iteration
AbsoluteChangePOM | Absolute change in POM from first sector to last sector
FractionalChangePOM | Fractional change in POM from first sector to last sector
RemainingDO | Concentration of dissolved oxygen remaining after each iteration
AbsoluteChangeDO | Absolute change in dissolved oxygen from first sector to last sector
FractionalChangeDO | Fractional change in dissolved oxygen from first sector to last sector
RemainingAmmonium | Concentration of ammonium remaining after each iteration
AbsoluteChangeAmmonium | Absolute change in ammonium from first sector to last sector
FractionalChangeAmmonium | Fractional change in ammonium from first sector to last sector
TotalCarbonHarvested | Total carbon harvested from the culture area
TotalNitrogenHarvested | Total nitrogen harvested from the culture area
TotalPhosphorousHarvested | Total phosphorous harvested from the culture area
TotalAnimalsHarvested | Total animals harvested from the culture area
TotalBiomassHarvested | Total biomass harvested from the culture area
TotalAPP | Total average physical product from the culture area


## Sector


When using the culture area and sector levels it is necessary to pass information to the sector for each iteration before and after each execution of Population.RunSIM. This is done via the Sector.RunSectorPre and Sector.RunSectorPost methods.

In order for the Sector and CultureArea classes to compute specific calculations correctly there are two properties; Sector.Populations (of type PopulationArrayList) and CultureArea.Sectors (of type SectorArrayList) which must be used. These allow you to add populations to an instance of a Sector class, and sectors to an instance of a CultureArea class after they have been initialised.

### Start
```
public void StartSector(
	double SectorVolume, // CultureArea.SectorVolume (m3)
	double DeltaTimestep // timestep
)
```
### Run
```
public void RunSectorPre(
	int Iteration, // current timestep (Day)
	double RateWaterFlow, // CultureArea.RateWaterFlow (m3/sec)
	double CHL, // Iteration Chlorophyll (µg/l)
	double POM, // Particulate Organic Matter (mg/l)
	double DissolvedOxygen, // Iteration Dissolved Oxygen (mg/l)
	double Ammonium // Iteration Ammonium (mg/l)
)
```

There are no parameters for the Sector.RunSectorPost method. This method is used for calculating resources available between sectors and working out aggregates.

```
public void RunSectorPost()
```


### Outputs

name | description
--- | ---
SectorVolume | Sector Volume
CHL\_Concentration | Concentration of chlorophyll
CHL\_Pseudofaeces\_In | Chlorophyll pseudofaeces into sector
CHL\_Filtration\_Out | Chlorophyll filtration from sector
CHL\_Transfer\_Out | Chlorophyll transferred out of sector 
POM\_Concentration | Concentration of particulate organic matter
POM\_Pseudofaeces\_In | Particulate organic matter into sector
POM\_Filtratrion\_Out | Particulate organic matter filtration from sector
POM\_Transfer\_Out | Particulate organic matter transferred out of sector
DO\_Concentration | Concentration of dissolved oxygen
DO\_Consumption\_Out | Dissolved oxygen consumption from sector
DO\_Transfer\_Out | Dissolved oxygen transferred out of sector
Ammonium\_Concentration | Concentration of ammonium
Ammonium\_Excretion\_In | Ammonium excretion into sector
Ammonium\_Transfer\_Out | Ammonium transferred out of sector
TotalCarbonHarvested | Total carbon harvested from sector
TotalNitrogenHarvested | Total nitrogen harvested from sector
TotalPhosphorousHarvested | Total phosphorous harvested from sector
TotalAnimalsHarvested | Total animals harvested from sector
TotalBiomassHarvested | Total biomass harvested from sector
TotalAPP | Total average physical product from sector
