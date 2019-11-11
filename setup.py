from setuptools import setup

setup(
    name='bathysphere-graph',
    version='1.4',
    description='Graph database manager for marine spatial data',
    url='https://www.oceanics.io',
    author='Oceanicsdotio',
    author_email='aquaculture@oceanics.io',
    packages=["bathysphere-graph"],
    license='MIT',
    install_requires=[
        "flask",
        "flask_cors",
        "gunicorn",
        "connexion",
        "pytest",
        "pytest_dependency",
        "neo4j-python-driver",
        "itsdangerous",
        "passlib",
        "yaml",
        "requests",
        "retry",
        "redis",
        "pg8000",
        "bidict"
    ],
    zip_safe=False)
