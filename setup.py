from setuptools import setup

setup(
    name='neritics-ml',
    version='0.1',
    description='Time series prediction with neural networks',
    url='https://bitbucket.com/aquaculture/neritics-ml',
    author='oceanicsdotio',
    author_email='aquaculture@oceanics.io',
    license='MIT',
    packages=["neritics_ml"],
    install_requires=[
        "numpy",
        "requests",
        "redis",
        "flask_cors",
        "gunicorn",
        "connexion",
        "tensorflow",
        "pandas"
    ],
    zip_safe=False
)
