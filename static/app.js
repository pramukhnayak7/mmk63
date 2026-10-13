const cellsNode = document.querySelector('#cells');
const dialog = document.querySelector('#create-dialog');
const toast = document.querySelector('#toast');
const themeToggle = document.querySelector('#theme-toggle');
let cells = [];
let toastTimer;

function setTheme(theme) {
    const isDark = theme === 'dark';
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    themeToggle.setAttribute('aria-pressed', String(isDark));
    themeToggle.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} theme`);
    themeToggle.querySelector('.theme-symbol').textContent = isDark ? '☀' : '☾';
    themeToggle.querySelector('.theme-name').textContent = isDark ? 'Light' : 'Dark';
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
        prompt.textContent = 'In [ ]:';
        const filename = document.createElement('span');
        filename.className = 'cell-filename';
        filename.textContent = cell.filename;
        const type = document.createElement('span');
        type.className = 'cell-type';
        type.textContent = 'PYTHON';
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
        codeText.textContent = cell.source.join('');
        code.append(codeText);
        article.append(header, code);
        cellsNode.append(article);
    }
}

async function loadNotebook() {
    document.querySelector('#connection-status').textContent = 'Connecting';
    try {
        const response = await fetch('/api/notebook', { cache: 'no-store' });
        if (!response.ok) throw new Error('Could not load code files.');
        const notebook = await response.json();
        cells = notebook.cells.map(cell => ({ filename: cell.metadata.filename, source: cell.source }));
        renderCells();
        document.querySelector('#connection-status').textContent = 'Connected';
    } catch (error) {
        document.querySelector('#connection-status').textContent = 'Connection error';
        showToast(error.message);
    }
}

function openDialog() {
    document.querySelector('#form-error').textContent = '';
    dialog.showModal();
    document.querySelector('#filename').focus();
}

document.querySelectorAll('#add-button, #empty-add-button, #add-inline-button, #add-cell-bottom').forEach(button => button.addEventListener('click', openDialog));
document.querySelectorAll('#close-dialog, #cancel-dialog').forEach(button => button.addEventListener('click', () => dialog.close()));
document.querySelector('#refresh-button').addEventListener('click', loadNotebook);
async function copyAll() {
    if (!cells.length) {
        showToast('No code to copy');
        return;
    }
    await copyText(cells.map(cell => `# ${cell.filename}\n${cell.source.join('')}`).join('\n\n'));
    showToast('All snippets copied');
}
document.querySelectorAll('#copy-all-button, #menu-copy-button').forEach(button => button.addEventListener('click', copyAll));
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
    await loadNotebook();
    showToast(`${result.name} saved`);
});

loadNotebook();