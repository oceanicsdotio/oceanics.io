from setuptools import setup, find_packages

setup(
    name='bathysphere',
    version='1.7',
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
    zip_safe=False
)
