from setuptools import setup, find_packages

setup(
    name='bathysphere',
    version='1.4',
    description='Marine geospatial data and analytics service',
    url='https://graph.oceanics.io',
    author='Oceanicsdotio',
    author_email='business@oceanics.io',
    packages=find_packages(),
    include_package_data=True,
    license='MIT',
    install_requires=[
        "flask",
        "flask_cors",
        "gunicorn",
        "connexion",
        "pytest",
        "pytest_dependency",
        "neo4j-driver",
        "itsdangerous",
        "passlib",
        "pyyaml",
        "requests",
        "retry",
        "redis",
        "pg8000",
        "bidict",
        "prance",
        "rq",
        "attrs",
        "click"
    ],
    entry_points="""
        [console_scripts]
        bathysphere=bathysphere.cli:cli
    """,
    zip_safe=False)
