from setuptools import setup, find_packages

setup(
    name='bathysphere',
    version='1.7',
    description='Marine geospatial data and analytics services',
    url='https://graph.oceanics.io',
    author='Oceanicsdotio',
    author_email='business@oceanics.io',
    packages=["bathysphere"],
    include_package_data=True,
    license='MIT',
    entry_points="""
        [console_scripts]
        bathysphere=cli:cli
    """,
    zip_safe=False
    )
