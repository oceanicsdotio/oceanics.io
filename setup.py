from setuptools import setup

setup(
    name='bathysphere',
    version='1.4',
    description='Marine geospatial data and analytics service',
    url='https://graph.oceanics.io',
    author='Oceanicsdotio',
    author_email='business@oceanics.io',
    packages=["bathysphere"],
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
        "bidict",
        "prance",
        "rq",
        "attrs"
    ],
    zip_safe=False)
