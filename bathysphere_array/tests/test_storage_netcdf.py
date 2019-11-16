from bathysphere_array.tests.conftest import scan


def test_storage_netcdf_variables_fixture(variables):

    assert isinstance(variables, list)
    assert variables
    salinity = [var for var in variables if var.get("name") == "salinity"]
    assert salinity.pop().get("dim", None) == 3


def test_storage_netcdf_necofs_load_local(necofs):
    """
    Check metadata of well-known dataset
    """
    assert necofs.file_format == necofs.data_model == "NETCDF3_CLASSIC"
    assert necofs.disk_format == "NETCDF3"
    assert necofs.dimensions
    assert necofs.isopen()

    scan(necofs, attribute="dimensions", verb=True)
    scan(necofs, attribute="variables", verb=True)


def test_storage_netcdf_landsat_load_local(osi):
    """
    Check metadata of well-known dataset
    """
    assert osi.data_model == "NETCDF4_CLASSIC"
    assert osi.isopen()
    assert osi.file_format == "NETCDF4_CLASSIC"
    assert osi.disk_format == "HDF5"

    scan(osi, attribute="dimensions", required={"r", "c"}, verb=True)
    scan(osi, attribute="variables", required={"lat", "lon", "OSI"}, verb=True)


def test_storage_netcdf_remote_nodc_connection(avhrr):
    """
    Can get to NODC server and report files
    """
    assert avhrr.cdr_variable == "sea_surface_temperature"
    assert avhrr.data_model == "NETCDF3_CLASSIC"
    assert avhrr.file_format == "NETCDF3_CLASSIC"
    assert avhrr.day_or_night == "Day"
    assert avhrr.processing_level == "L3C"
    assert avhrr.start_time
    assert avhrr.stop_time

    scan(avhrr, attribute="dimensions", verb=True)
    scan(avhrr, attribute="variables", verb=True)
