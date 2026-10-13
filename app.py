#!/usr/bin/env python3
"""Serve read-only notebook-style code snippets from text files."""

import json
import re
import uuid
from pathlib import Path

from flask import Flask, jsonify, render_template, request

app = Flask(__name__)
CODE_DIR = Path(__file__).parent / "code_files"
CODE_DIR.mkdir(exist_ok=True)
MAX_FILE_SIZE = 1_000_000


@app.route("/")
def index():
    return render_template("notebook.html")


@app.route("/api/notebook")
def get_notebook():
    name = request.args.get("name", "")
    if name == "snippets":
        return jsonify(_get_snippets_notebook())

    if not name or Path(name).name != name or not name.lower().endswith(".ipynb"):
        return jsonify({"error": "Choose a notebook from the available list."}), 400

    notebook_path = Path(__file__).parent / name
    if not notebook_path.is_file():
        return jsonify({"error": "Notebook not found."}), 404

    try:
        notebook = json.loads(notebook_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return jsonify({"error": "Could not read this notebook."}), 400

    if not isinstance(notebook, dict) or not isinstance(notebook.get("cells"), list):
        return jsonify({"error": "This file is not a valid notebook."}), 400

    notebook["name"] = name
    return jsonify(notebook)


def _get_snippets_notebook():
    cells = []
    for txt_file in sorted(CODE_DIR.glob("*.txt"), key=lambda file: file.name.lower()):
        content = txt_file.read_text(encoding="utf-8", errors="replace")
        cells.append({
            "cell_type": "code",
            "execution_count": None,
            "metadata": {
                "id": str(uuid.uuid5(uuid.NAMESPACE_URL, txt_file.name)),
                "language": "python",
                "filename": txt_file.name,
            },
            "outputs": [],
            "source": content.splitlines(keepends=True),
        })

    return {
        "name": "Code snippets",
        "cells": cells,
        "metadata": {
            "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
            "language_info": {"name": "python"},
        },
        "nbformat": 4,
        "nbformat_minor": 5,
    }


@app.route("/api/notebooks")
def list_notebooks():
    workspace = Path(__file__).parent
    notebooks = [
        {"name": file.name, "kind": "notebook"}
        for file in sorted(workspace.glob("*.ipynb"), key=lambda file: file.name.lower())
        if file.is_file()
    ]
    if any(CODE_DIR.glob("*.txt")):
        notebooks.append({"name": "Code snippets", "kind": "snippets", "value": "snippets"})
    return jsonify(notebooks)


@app.route("/api/files", methods=["GET", "POST"])
def files():
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        name = str(data.get("name", "")).strip()
        content = data.get("content", "")
        if name.lower().endswith(".txt"):
            name = name[:-4]
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9 _.-]{0,79}", name):
            return jsonify({"error": "Use a filename with letters, numbers, spaces, dots, hyphens, or underscores."}), 400
        if not isinstance(content, str):
            return jsonify({"error": "Code content must be text."}), 400
        if len(content.encode("utf-8")) > MAX_FILE_SIZE:
            return jsonify({"error": "Code files must be smaller than 1 MB."}), 413

        target = CODE_DIR / f"{name}.txt"
        if target.exists():
            return jsonify({"error": "A file with that name already exists."}), 409
        target.write_text(content, encoding="utf-8")
        return jsonify({"name": target.name}), 201

    return jsonify([
        {"name": file.name, "size": file.stat().st_size}
        for file in sorted(CODE_DIR.glob("*.txt"), key=lambda file: file.name.lower())
    ])


if __name__ == "__main__":
    print(f"Code directory: {CODE_DIR}")
    print("Open http://localhost:5000 (or your phone's LAN IP)")
    app.run(host="0.0.0.0", port=5000, debug=False)