export const destinations = [
  { id: 'cv', label: 'CV', object: 'Computer', icon: 'computer' },
  { id: 'projects', label: 'Projects', object: 'Project shelf', icon: 'books' },
  { id: 'reading', label: 'Reading', object: 'Reading shelf', icon: 'book' },
  { id: 'work', label: 'Work history', object: 'Pinboard', icon: 'badge' },
  { id: 'hobbies', label: 'Interests', object: 'Cabinet', icon: 'cabinet' },
];

export function readPortfolio(source) {
  const jobs = [...source.querySelectorAll('#work .badge-body')].map(badge => ({
    company: badge.querySelector('h3').textContent,
    role: badge.querySelector('.role-detail').textContent,
    dates: badge.querySelector('.dates').textContent,
    bullets: [...badge.querySelectorAll('li')].map(item => item.textContent),
  }));
  const projects = [...source.querySelectorAll('#projects .project-card')].map(project => ({
    title: project.querySelector('h3').textContent,
    blocks: [...project.querySelectorAll('.project-copy h3, .project-markdown > *')].flatMap(element =>
      element.tagName === 'UL'
        ? [...element.children].map(item => ({ type: 'list', text: item.textContent }))
        : [{ type: element.tagName.toLowerCase(), text: element.textContent }]),
  }));
  const reading = [...source.querySelectorAll('#reading li')].map(book => ({
    title: book.querySelector('a').textContent,
    author: book.querySelector('span').textContent,
    shelf: book.dataset.shelf,
  }));
  return { jobs, projects, reading };
}

const paths = {
  computer: '<rect x="3" y="3" width="18" height="13" rx="1"/><path d="M8 21h8m-4-5v5M7 8l3 2-3 2m6 0h4"/>',
  books: '<path d="M3 4v16h4V4H3Zm5 0v16h4V4H8Zm6 1 4-1 4 15-4 1-4-15Z"/>',
  book: '<path d="M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1Zm0 0v15"/>',
  badge: '<rect x="4" y="6" width="16" height="16" rx="2"/><path d="M9 6V2h6v4M8 17h8m-8 3h5"/><circle cx="12" cy="12" r="2"/>',
  cabinet: '<rect x="4" y="2" width="16" height="19" rx="1"/><path d="M12 2v19M9 9v4m6-4v4M6 21v2m12-2v2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="m8 4 8 8-8 8M3 12h13"/>',
  back: '<path d="m12 5-7 7 7 7M5 12h15"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  menu: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  home: '<path d="m3 10 9-8 9 8v11h-7v-7h-4v7H3V10Z"/>',
  rotate: '<path d="M3 10a9 9 0 1 1 2 8M3 3v7h7"/>',
};

export function icon(name) {
  if (!paths[name]) throw new Error(`Unknown study icon: ${name}`);
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
}
