# Notebook Desk

A small Flask app that displays workspace `.ipynb` files or `.txt` snippets as read-only, copyable notebook cells. Snippets are stored in `code_files/`; notebook files in the workspace root are available from the notebook selector. Code is never executed by the app.

## Run in Termux

```sh
pkg update
pkg install python
cd ~/jyupter\ notebook
python -m pip install -r requirements.txt
python app.py
```

Open `http://127.0.0.1:5000` on the phone. To open it from another device on the same Wi-Fi, use `http://PHONE_IP:5000` instead. The app listens on all network interfaces, so only expose it on networks you trust.

Select a workspace `.ipynb` file from the notebook dropdown, or choose **Code snippets** to view `.txt` files from `code_files/`. Use the plus button to create a text snippet. Each text file becomes a cell with a copy button; code is never run.

The palettes follow Jupyter's upstream theme sources: [Notebook 7 styles](https://github.com/jupyter/notebook/tree/main/packages/notebook-extension/style/base.css), [JupyterLab light tokens](https://github.com/jupyterlab/jupyterlab/blob/main/packages/theme-light-extension/style/variables.css), and [JupyterLab dark tokens](https://github.com/jupyterlab/jupyterlab/blob/main/packages/theme-dark-extension/style/variables.css).