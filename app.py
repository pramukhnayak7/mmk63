#!/usr/bin/env python3
"""Serve read-only notebook-style code snippets from text files."""

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

    return jsonify({
        "cells": cells,
        "metadata": {
            "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
            "language_info": {"name": "python"},
        },
        "nbformat": 4,
        "nbformat_minor": 5,
    })


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