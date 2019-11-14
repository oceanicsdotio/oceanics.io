from bathysphere.tests.conftest import avhrr_start, avhrr_end
from bathysphere.storage import avhrr_index
from datetime import datetime
from bathysphere.utils import spherical_nearest_neighbor


def test_raster_avhrr_indexed_correctly_with_yield(avhrr, config_no_app):
    """Can index and return results."""
    host = config_no_app["WELL_KNOWN_SERVICES"]["National Oceanography Data Center"]
    files = avhrr_index(host=host, start=avhrr_start, end=avhrr_end)
    assert isinstance(files, list)
    assert len(files) > 0


def test_avhrr_subsetting():
    sites = [
        {"name": "Lubec", "id": None, "location": [-66.952102, 44.813306]},
        {"name": "Two Lights", "id": None, "location": [-70.196510, 43.564946]},
    ]

    start = datetime(2015, 10, 1)
    end = datetime(2018, 12, 31)

    image = avhrr_index()
    nn = image.nearest_neighbor(sites)
    dates = image.dates
    nsteps = int((dates[-1] - start).days * 24 + (dates[-1] - start).seconds / 60 / 60)

    if False:
        sst = temperature(nprocs=4, chunk=8)
    else:
        years = [2015, 2016, 2017, 2018]
        sst = image.load_year_cache(years)
