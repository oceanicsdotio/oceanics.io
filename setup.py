from setuptools import setup, find_packages

setup(
    name='bathysphere',
    version='2.0',
    description='Ocean data and analytics services',
    url='https://www.oceanics.io/bathysphere',
    author='Oceanicsdotio',
    author_email='business@oceanics.io',
    packages=["bathysphere"],
    include_package_data=True,
    license='MIT',
    entry_points="""
        [console_scripts]
        bathysphere=cli:cli
    """,
    zip_safe=False,
)
