export function createTerminal({ onCV }) {
  const element = document.createElement('section');
  element.id = 'computer-terminal';
  element.setAttribute('aria-label', 'Study terminal');
  element.hidden = true;
  const output = document.createElement('pre');
  output.setAttribute('role', 'status');
  output.setAttribute('aria-live', 'polite');
  output.textContent = 'THE STUDY\nType a command. Tab for help.';
  const form = document.createElement('form');
  const prompt = document.createElement('span');
  prompt.textContent = '> ';
  prompt.setAttribute('aria-hidden', 'true');
  const input = document.createElement('input');
  input.setAttribute('aria-label', 'Terminal command');
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.autocapitalize = 'off';
  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.textContent = '↵';
  submit.setAttribute('aria-label', 'Run command');
  const help = document.createElement('button');
  help.type = 'button';
  help.textContent = 'Tab / commands';
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
  };
  for (const command of Object.keys(commands)) {
    const option = document.createElement('button');
    option.type = 'button';
    option.textContent = command;
    option.addEventListener('click', () => {
      input.value = command;
      showMenu(false);
      input.focus();
    });
    menu.append(option);
  }
  help.addEventListener('click', () => showMenu(menu.hidden));
  input.addEventListener('keydown', event => {
    if (event.key === 'Tab' && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
      event.preventDefault();
      showMenu(menu.hidden);
      if (!menu.hidden) menu.querySelector('button').focus();
    }
    if (event.key === 'Escape' && !menu.hidden) {
      event.stopPropagation();
      showMenu(false);
    }
  });
  menu.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      showMenu(false);
      input.focus();
    }
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const command = input.value.trim().replace(/\s+/g, ' ');
    input.value = '';
    showMenu(false);
    if (!command) return;
    const result = Object.hasOwn(commands, command)
      ? commands[command]()
      : `Unknown command: ${command}\nPress Tab for supported commands.`;
    if (result !== null) output.textContent = result;
  });
  form.append(prompt, input, submit);
  element.append(output, form, help, menu);
  document.querySelector('.room-wrap').append(element);
  return { element, showCV: text => { output.textContent = text; showMenu(false); } };
}
