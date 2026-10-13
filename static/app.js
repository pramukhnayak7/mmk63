const cellsNode = document.querySelector('#cells');
const dialog = document.querySelector('#create-dialog');
const toast = document.querySelector('#toast');
const themeToggle = document.querySelector('#theme-toggle');
const notebookPicker = document.querySelector('#notebook-picker');
let cells = [];
let selectedNotebook = '';
let toastTimer;

function setTheme(theme) {
    const isDark = theme === 'dark';
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    themeToggle.setAttribute('aria-pressed', String(isDark));
    themeToggle.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} theme`);
    themeToggle.querySelector('.theme-symbol').textContent = isDark ? '' : '';
    document.querySelector('#browser-theme-color').content = isDark ? '#424242' : '#eeeeee';
    localStorage.setItem('notebook-theme', isDark ? 'dark' : 'light');
}

setTheme(localStorage.getItem('notebook-theme') || 'light');
themeToggle.addEventListener('click', () => {
    setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
});

function showToast(message) {
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 2200);
}

async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text);
    } catch {
        const temporary = document.createElement('textarea');
        temporary.value = text;
        temporary.style.position = 'fixed';
        temporary.style.opacity = '0';
        document.body.append(temporary);
        temporary.select();
        document.execCommand('copy');
        temporary.remove();
    }
}

function renderCells() {
    cellsNode.replaceChildren();
    document.querySelector('#empty-state').hidden = cells.length > 0;
    document.querySelector('#copy-all-button').disabled = cells.length === 0;
    document.querySelector('#cell-count').textContent = `${cells.length} ${cells.length === 1 ? 'cell' : 'cells'}`;

    for (const [index, cell] of cells.entries()) {
        const article = document.createElement('article');
        article.className = 'code-cell';
        article.id = `cell-${index + 1}`;
        article.dataset.filename = cell.filename;
        const header = document.createElement('div');
        header.className = 'cell-head';
        const label = document.createElement('div');
        label.className = 'cell-label';
        const prompt = document.createElement('span');
        prompt.className = 'prompt';
        prompt.textContent = cell.cell_type === 'code' ? 'In [ ]:' : '';
        const filename = document.createElement('span');
        filename.className = 'cell-filename';
        filename.textContent = cell.filename;
        const type = document.createElement('span');
        type.className = 'cell-type';
        type.textContent = cell.cell_type === 'markdown' ? 'MARKDOWN' : 'PYTHON';
        label.append(prompt, filename, type);
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-button';
        copyButton.type = 'button';
        copyButton.innerHTML = '<span aria-hidden="true">▣</span> Copy';
        copyButton.addEventListener('click', async () => {
            await copyText(cell.source);
            copyButton.textContent = 'Copied';
            setTimeout(() => { copyButton.innerHTML = '<span aria-hidden="true">▣</span> Copy'; }, 1300);
        });
        header.append(label, copyButton);
        const code = document.createElement('pre');
        code.className = 'code-content';
        const codeText = document.createElement('code');
        codeText.textContent = cell.source;
        code.append(codeText);
        article.append(header, code);
        cellsNode.append(article);
    }
}

async function loadNotebook(name = selectedNotebook) {
    document.querySelector('#connection-status').textContent = 'Connecting';
    try {
        const response = await fetch(`/api/notebook?name=${encodeURIComponent(name)}`, { cache: 'no-store' });
        if (!response.ok) throw new Error('Could not load this notebook.');
        const notebook = await response.json();
        selectedNotebook = name;
        cells = notebook.cells.map((cell, index) => ({
            cell_type: cell.cell_type || 'code',
            filename: cell.metadata?.filename || `Cell ${index + 1}`,
            source: Array.isArray(cell.source) ? cell.source.join('') : (cell.source || ''),
        }));
        const title = (notebook.name || name).replace(/\.ipynb$/i, '');
        document.querySelector('#notebook-title').textContent = title;
        document.title = `${title} - Jupyter Notebook`;
        renderCells();
        document.querySelector('#connection-status').textContent = 'Connected';
    } catch (error) {
        document.querySelector('#connection-status').textContent = 'Connection error';
        showToast(error.message);
    }
}

async function loadNotebookList() {
    const response = await fetch('/api/notebooks', { cache: 'no-store' });
    if (!response.ok) throw new Error('Could not load notebooks.');
    const notebooks = await response.json();
    notebookPicker.replaceChildren();
    for (const notebook of notebooks) {
        const option = document.createElement('option');
        option.value = notebook.value || notebook.name;
        option.textContent = notebook.name;
        notebookPicker.append(option);
    }
    if (!notebooks.length) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No notebooks found';
        notebookPicker.append(option);
        notebookPicker.disabled = true;
        return;
    }
    selectedNotebook = notebooks.some(notebook => (notebook.value || notebook.name) === selectedNotebook)
        ? selectedNotebook
        : (notebooks[0].value || notebooks[0].name);
    notebookPicker.value = selectedNotebook;
    await loadNotebook(selectedNotebook);
}

function openDialog() {
    document.querySelector('#form-error').textContent = '';
    dialog.showModal();
    document.querySelector('#filename').focus();
}

document.querySelector('#add-inline-button').addEventListener('click', openDialog);
document.querySelectorAll('#close-dialog, #cancel-dialog').forEach(button => button.addEventListener('click', () => dialog.close()));
document.querySelector('#refresh-button').addEventListener('click', () => loadNotebook());
notebookPicker.addEventListener('change', () => loadNotebook(notebookPicker.value));
async function copyAll() {
    if (!cells.length) {
        showToast('No code to copy');
        return;
    }
    await copyText(cells.map(cell => cell.source).join('\n\n'));
    showToast('Notebook copied');
}
document.querySelector('#copy-all-button').addEventListener('click', copyAll);
document.querySelector('#create-form').addEventListener('submit', async event => {
    event.preventDefault();
    const errorNode = document.querySelector('#form-error');
    const response = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: document.querySelector('#filename').value,
            content: document.querySelector('#code-content').value,
        }),
    });
    const result = await response.json();
    if (!response.ok) {
        errorNode.textContent = result.error || 'Could not save this file.';
        return;
    }
    dialog.close();
    event.currentTarget.reset();
    await loadNotebookList();
    showToast(`${result.name} saved`);
});

loadNotebookList().catch(error => {
    document.querySelector('#connection-status').textContent = 'Connection error';
    showToast(error.message);
});