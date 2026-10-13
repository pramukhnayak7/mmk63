# Notebook Desk

A small Flask app that displays `.txt` files as read-only, copyable notebook cells. Snippets are stored in `code_files/` and are never executed by the app.

## Run in Termux

```sh
pkg update
pkg install python
cd ~/jyupter\ notebook
python -m pip install -r requirements.txt
python app.py
```

Open `http://127.0.0.1:5000` on the phone. To open it from another device on the same Wi-Fi, use `http://PHONE_IP:5000` instead. The app listens on all network interfaces, so only expose it on networks you trust.

Create snippets with **New snippet** in the app or put `.txt` files directly in `code_files/`. Each text file becomes a cell with a copy button; code is not editable after saving through the app and is never run.

The palettes follow Jupyter's upstream theme sources: [Notebook 7 styles](https://github.com/jupyter/notebook/tree/main/packages/notebook-extension/style/base.css), [JupyterLab light tokens](https://github.com/jupyterlab/jupyterlab/blob/main/packages/theme-light-extension/style/variables.css), and [JupyterLab dark tokens](https://github.com/jupyterlab/jupyterlab/blob/main/packages/theme-dark-extension/style/variables.css).