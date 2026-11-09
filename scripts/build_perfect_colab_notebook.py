import json
from pathlib import Path


notebook = {
    "nbformat": 4,
    "nbformat_minor": 5,
    "metadata": {
        "kernelspec": {
            "name": "python3",
            "display_name": "Python 3",
            "language": "python",
        },
        "language_info": {"name": "python"},
    },
    "cells": [
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "# Retired Swar Yoga avatar GPU notebook\n",
                "\n",
                "This legacy notebook generator is retired. Its previous face-swap workflow had unverified model licensing, consent handling, identity quality, GPU availability, and output provenance. It must not be used to create or publish avatar videos.\n",
                "\n",
                "The in-house web queue is a separate foundation and currently has no neural video renderer. A future worker must use approved model code and weights, verified consent, secure server-side Bunny credentials, output validation, and the authenticated render-worker API. This notebook does not install models, process media, upload files, or register outputs.",
            ],
        }
    ],
}

output_path = Path(__file__).resolve().parents[1] / "public/colab/Swar_Yoga_Digital_Twin_Colab.ipynb"
output_path.parent.mkdir(parents=True, exist_ok=True)
output_path.write_text(json.dumps(notebook, indent=2) + "\n", encoding="utf-8")
print(f"Wrote retired-notebook notice: {output_path}")
