# Soft‑Rules:  that the LLM / AI Agent should follow

## folders/files to avoid accessing by the LLM or any other component of the application
- **.env** – contains API credentials, tokens, and any other secrets.
- **junk/** – temporary experiment artefacts that are not part of the production pipeline.
- **.venv/** – virtual environment for Python dependencies.
- **notebooks/** – Jupyter notebooks for data analysis and visualization.

> These folders are **not** off‑limits to the Python runtime; they are only a *guideline* for the LLM and for human reviewers.
