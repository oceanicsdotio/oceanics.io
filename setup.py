"""
Installation for the API and CLI.
"""
from setuptools import setup

setup(
    name='bathysphere',
    version='2.0',
    description='Ocean data and analytics services',
    url='https://www.oceanics.io/bathysphere',
    author='Oceanicsdotio',
    author_email='business@oceanics.io',
    packages=["bathysphere", "capsize"],
    include_package_data=True,
    license='MIT',
    entry_points="""
        [console_scripts]
        bathysphere=bathysphere.cli:cli
    """,
    zip_safe=False,
)
