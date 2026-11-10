export function createTerminal({ onCV, onExit }) {
  const element = document.createElement('section');
  element.id = 'computer-terminal';
  element.setAttribute('aria-label', 'Study terminal');
  element.hidden = true;
  const output = document.createElement('pre');
  output.setAttribute('role', 'status');
  output.setAttribute('aria-live', 'polite');
  const form = document.createElement('form');
  const prompt = document.createElement('span');
  prompt.textContent = 'justinattw$ ';
  prompt.setAttribute('aria-hidden', 'true');
  const input = document.createElement('input');
  input.setAttribute('aria-label', 'Terminal command');
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.autocapitalize = 'off';
  const commandLine = document.createElement('span');
  commandLine.className = 'terminal-input';
  const caret = document.createElement('span');
  caret.className = 'terminal-caret';
  caret.setAttribute('aria-hidden', 'true');
  function updateCaret() {
    caret.style.left = `calc(${input.selectionStart ?? input.value.length}ch - ${input.scrollLeft}px)`;
  }
  for (const event of ['input', 'click', 'keyup', 'scroll', 'focus']) input.addEventListener(event, updateCaret);
  document.addEventListener('selectionchange', () => {
    if (document.activeElement === input) updateCaret();
  });
  commandLine.append(input, caret);
  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.textContent = '↵';
  submit.setAttribute('aria-label', 'Run command');
  const help = document.createElement('button');
  help.type = 'button';
  const shortcut = document.createElement('kbd');
  shortcut.textContent = '\\';
  help.append(shortcut, ' for commands');
  help.setAttribute('aria-label', 'Backslash for commands');
  help.setAttribute('aria-keyshortcuts', '\\');
  help.setAttribute('aria-expanded', 'false');
  help.setAttribute('aria-controls', 'terminal-commands');
  const menu = document.createElement('div');
  menu.id = 'terminal-commands';
  menu.setAttribute('aria-label', 'Supported commands');
  menu.hidden = true;
  function showMenu(show) {
    menu.hidden = !show;
    help.setAttribute('aria-expanded', String(show));
  }
  const commands = {
    'download resume.pdf': () => {
      const link = document.createElement('a');
      link.href = '/justin-wong-resume.pdf';
      link.download = 'Justin-Wong-Resume.pdf';
      link.click();
      return 'Downloading resume.pdf.';
    },
    'open github.com/justinattw': () => {
      const link = document.createElement('a');
      link.href = 'https://github.com/justinattw';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.click();
      return 'Opening github.com/justinattw in a new tab.';
    },
    'open resume.pdf': () => {
      const link = document.createElement('a');
      link.href = '/justin-wong-resume.pdf';
      link.target = '_blank';
      link.rel = 'noopener';
      link.click();
      return 'Opening resume.pdf in a new tab.';
    },
    ls: () => 'resume.pdf',
    cv: () => { onCV(); return null; },
    help: () => { showMenu(true); return 'Choose a command below.'; },
    clear: () => '',
    exit: () => { onExit(); return null; },
  };
  for (const command of Object.keys(commands)) {
    const option = document.createElement('button');
    option.type = 'button';
    option.textContent = command;
    option.addEventListener('click', () => {
      input.value = command;
      form.requestSubmit();
      if (command !== 'exit') input.focus({ preventScroll: true });
    });
    menu.append(option);
  }
  help.addEventListener('click', () => showMenu(menu.hidden));
  window.addEventListener('keydown', event => {
    if (element.hidden) return;
    if (event.key === '\\' && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey && !event.isComposing) {
      event.preventDefault();
      showMenu(menu.hidden);
      if (!menu.hidden) menu.querySelector('button').focus();
      else input.focus();
    }
    if (event.key === 'Escape' && !menu.hidden) {
      event.preventDefault();
      event.stopPropagation();
      showMenu(false);
    }
  });
  menu.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      showMenu(false);
      input.focus();
    }
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const command = input.value.trim().replace(/\s+/g, ' ');
    input.value = '';
    updateCaret();
    showMenu(false);
    if (!command) return;
    help.hidden = true;
    const result = Object.hasOwn(commands, command)
      ? commands[command]()
      : `Unknown command: ${command}\nPress \\ for supported commands.`;
    if (result !== null) output.textContent = command === 'clear' ? '' : `justinattw$ ${command}\n${result}`;
  });
  form.append(prompt, commandLine, submit);
  element.append(help, output, form, menu);
  document.querySelector('.room-wrap').append(element);
  return {
    element,
    focus: () => input.focus({ preventScroll: true }),
    showCV: text => { output.textContent = text; showMenu(false); },
  };
}
