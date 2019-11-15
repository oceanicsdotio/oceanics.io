



# LOBOVIZ

## Formatting queries

In the simplest case `goodbuoy` is a client for Satlantic LOBOviz servers. The `query()` method is provided as an interoperability convenience, but should be consider depreciated. University of Maine buoys are part of the http://maine.loboviz.com/cgi-data/nph-data.cgi service root URI.  A query string follows this, which is composed of time range specification, buoy identifier (`node=`), and fields (`params=`). Requests also take `start=` and `end=`, or `samples=` as arguements. You can use optional arguements `protocol` and `service` to define how data are accessed. The range of dates (whole days) are constrained with `min_date` and `max_date`, for instance,

```python
start = "20170801"
end = "20170831"
date = "min_date=" + start + "&" + "max_date=" + end
fields = "y=" + param1 + "," + param2 + "," + param3 + ...
```

Instead of specifying a date range, you can request the last N calendar days or N samples of data using days and newest, respectively. This would take the form `date="days=10"` or `date="newest=24"`. 

Because data is logged hourly, the newest is also the number of hours previous to return. The most recent measurement becomes available about 30 minutes after it is collected. 

The user may only request data for a single buoy at a time, each of which has a unique integer identifier, `node = "node=66"`. Sensor 66 is currently deployed in the upper Damariscotta Estuary; sensors 70 and 71 are Casco Bay sites 1 and 2, respectively; and sensor 72 is located in the Bagaduce River. The Bowdoin College buoy is sensor 52. 

Omitting this, requesting multiple buoys, or using the nodes parameter—which LOBOVIZ plots rely on will result in an error. 

Data fields are returned as columns in the order they are requested, according to a comma-separated expression. The options for variables include those in the table below.



**Table 2. Well-known parameters**

| Name                | Unit    | Description                                                  | Source |
| ------------------- | ------- | ------------------------------------------------------------ | ------ |
| `cdom`              |         | Colored dissolved organic matter                             | SEANET |
| `chlorophyll`       |         | Chlorophyll-a fluoresence                                    | SEANET |
| `conductivity`      |         | Conductivity                                                 | SEANET |
| `current_direction` | degrees | Angle of current relative to true North                      | SEANET |
| `current_speed_cm`  | cm/s    | Speed of water relative to platform                          | SEANET |
| `depth`             | meters  | Depth of the pressure sensor for interpreting other observations | SEANET |
| `oxygen`            |         | Dissolved oxygen                                             | SEANET |
| `nitrate`           |         | Nitrate                                                      | SEANET |
| `oxygen_sat`        |         | Oxygen saturation                                            | SEANET |
| `oxygen_percent`    | %       | Oxygen percent saturation                                    | SEANET |
| `par0minus`         |         | Photosynthetically active radiation below water              | SEANET |
| `par0plus`          |         | Photosynthetically active radiation above water              | SEANET |
| `salinity`          | psu     | Salinity                                                     | SEANET |
| `temperature`       | deg C   | Temperature                                                  | SEANET |
| `transmission`      |         | Optical transmission of water                                | SEANET |
| `turbidity`         | NTU     | Turbidity                                                    | SEANET |
|                     |         |                                                              |        |
|                     |         |                                                              |        |
|                     |         |                                                              |        |
|                     |         |                                                              |        |

You cannot query latitude, longitude, or battery voltage. Specifying no valid fields will return just temperature. Specifying an invalid field will not return an error, meaning that you’ll have to incorporate your own error handling—though the buoy configurations are unlikely to change. 

The final parameter is `data_format=text`. This is outputs pure text, as would be displayed in a web browser. The date-time column is `YYYY–MM–DD HH:MM:SS`. The date and time a separated by a single space, while columns are tab-delimited. If omitted, the response will be a file. Depending on your usage, these may be identical. The full query looks like:

```python
query = "?" + date + "&" + fields + "&" + node + "&data_format=text"
```

The node is translated to a sensible name, and there is limited auto-correct that will sometimes forgive you for guessing the field name.





## LOBOViz compatibility

Because Good Buoy is a replacement/enhancement for a legacy system, this section describes how features map between the two applications. The major difference is that Good Buoy follows SensorThings API and SpatioTemporal Asset Catatlog specifications (mostly), and produces and consumes JSON responses. 



The protected [LOBOViz admin panel](https://maine.loboviz.com/info) has 4 sections:

* Status: Current configuration, calibrations, and logs
* Data: Recent and archived data with summary statistics
* Management: 
* Graphing: 



**Table. Status Options**

| Heading                                                      |         Auth         | Description                                                  | Path      | Query        | Tokens        |
| :----------------------------------------------------------- | :------------------: | :----------------------------------------------------------- | --------- | ------------ | ------------- |
| [Configuration](http://maine.loboviz.com/cgi-config/system-config) | ![](../static/lock.png) | Node and parameter definitions.                              | `Things`  | `GET`        | `$events`     |
| [Data age](http://maine.loboviz.com/latest/age-of-data.html) | ![](../static/lock.png) | Data ages                                                    | `Things`  | `GET`        | `$statistics` |
| [Schedules](http://maine.loboviz.com/schedule/)              | ![](../static/lock.png) | Browse schedule files                                        | `Things`  | `GET`        | `$schedule`   |
| [System logs](http://maine.loboviz.com/status/)              | ![](../static/lock.png) | E-mail and processing logs                                   | `Things`  | `GET`        | `$logs`       |
| [XML](http://maine.loboviz.com/ingestorxml/)                 | ![](../static/lock.png) | Instrument configuration files                               | `Sensors` | `GET`        | `$config`     |
| [XML Sensors](http://maine.loboviz.com/cgi-config/list-xml-sensors) | ![](../static/lock.png) | Sites and frames                                             | `Sensors` | `GET`        | —             |
| [Check schedule files](http://maine.loboviz.com/cgi-config/check-schedule) | ![](../static/lock.png) | Check file for errors in browser.<br /><br />Notes: We check files automatically during upload. | `Things`  | `POST` `PUT` | `$schedule`   |

**Table 4. Data**

| Heading                                             |         Auth         | Description                                  | Path     | Query | Tokens        |
| :-------------------------------------------------- | :------------------: | :------------------------------------------- | -------- | ----- | ------------- |
| [Archive](http://maine.loboviz.com/archive/)        | ![](../static/lock.png) | Raw data (`.raw`) and log (`.raw.txt`) files | `Things` | `GET` | `$archive`    |
| [Info](http://maine.loboviz.com/cgi-data/data-info) |                      | Summary table with site, first, last, total  | `Things` | `GET` | `$statistics` |
| [Pending](http://maine.loboviz.com/data/)           | ![](../static/lock.png) | Files waiting to be processed                | `Things` | `GET` | `$pending`    |
| [Recent-Raw](http://maine.loboviz.com/newest-raw/)  | ![](../static/lock.png) | Daily raw text                               | `Things` | `GET` | `$recent`     |

**Table 5. Management**

| Heading       | Auth | Description     | Equivalent | Query |  |
| :----------- | :--: | :------------------------------------ | ------------------------------------- | ------------------------------------- | ------------------------------------- |
| [Event settings](http://maine.loboviz.com/cgi-config/edit-events) | ![](../static/lock.png) | Settings for events, e-mail contacts.    | `Things` | `PUT` | `$events` |
| [Hide bad events](http://maine.loboviz.com/protected/hide-bad-data.shtml) | ![](../static/lock.png) | Hide or show values for one site, any number of variables, on a single day for some number of hours. | `Datastreams` | `PUT` | `$mask` |
| [Modify sensor values](http://maine.loboviz.com/protected/modify-values.shtml) | ![](../static/lock.png) | Apply correction to database values for calibration change. <br /><br />Notes: Our implementation is algorithmic instead of manual. | `Datastreams` | `PUT` | `$resample` |
| [Remove sensor values](http://maine.loboviz.com/protected/remove-values.shtml) | ![](../static/lock.png) | Delete database values outside nominal range, but not raw data. <br /><br />Note: We mask instead of delete. Using `GET` will transform and return the data without persisting the change. | `Datastreams` | `PUT` `GET` | `$mask` |
| [Schedule upload](http://maine.loboviz.com/cgi-auth/cgiwrap/lobodata/schedule-upload) | ![](../static/lock.png) | Upload acquisition schedule files for StorX. | `Things` | `POST` | `$schedule` |
| [Instrument swaps](http://maine.loboviz.com/protected/instrument-swaps.html) | ![](../static/lock.png) | Move instruments between sites, and view move history | `Sensors` | `PUT` `GET` | `$swap` |
| [Instrument XML upload](http://maine.loboviz.com/cgi-auth/cgiwrap/lobodata/single-xml-upload) | ![](../static/lock.png) | Upload XML/sensor file for use with swapping function | `Sensors` | `POST` `PUT` | `$config` |
| [Calibration values](http://maine.loboviz.com/cgi-auth/cgiwrap/lobodata/calibration-values-step1) | ![](../static/lock.png) | Modify existing XML file with new calibrations | `Sensors` | `POST` `PUT` `GET` | `$calibrate` |
**Table 6. Graphing**

| Heading | Auth | Description | Path | Query | Parameter |
| :-- | :-- | --- | :-- | --- | --- |
| [Averages](http://maine.loboviz.com/loboviz/research/averages.shtml) |  |One sensor, one site, one averaging window (d/w/m/y), for any date range. |`Datastreams` |`GET` |`$resample` `$image` |
| [By year](http://maine.loboviz.com/loboviz/research/by-year.shtml) |  | One variable, overlapping years. Replace with Julian day. | `Datastreams` | `GET` | `$image` `$wrap` |
| [Non-public](http://maine.loboviz.com/protected/) | ![](../static/lock.png) |Includes extra y-variables for diagnostic |`Datastreams` |`GET` |`$image` |
|[Peaks](http://maine.loboviz.com/loboviz/research/recent-peaks.shtml) |![](../static/lock.png) | Min and max values and the date of occurance, for single site. | `Datastreams` | `GET` | `$statistics` |
|[Year background](http://maine.loboviz.com/loboviz/research/year-background.shtml) | | Display single variable for year against daily min/max for multiple other years. <br /><br />Note: Replaced with daily moving average and envelope of other sites. | `Datastreams` | `GET` | `$image` `$wrap` `$resample` `$statistics` |


