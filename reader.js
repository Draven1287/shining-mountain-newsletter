const sections = [...document.querySelectorAll('main section')];
const menu = document.querySelector('.contents');
const motion = document.querySelector('#motion');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const wide = matchMedia('(min-width:761px)');
const done = new WeakSet();
let enabled = !reduced.matches, current, pending = false;
menu.open = wide.matches;
wide.onchange = e => menu.open = e.matches;

function finish(section) {
  const video = section.querySelector('video');
  done.add(section);
  video.pause();
  video.classList.remove('playing');
}

function start(section, replay = false) {
  if (!section || document.hidden || (!replay && (!enabled || done.has(section)))) return;
  const video = section.querySelector('video');
  if (!video.src) video.src = video.dataset.src;
  if (replay) { done.delete(section); video.currentTime = 0; }
  video.loop = false;
  video.playbackRate = 1.25;
  video.play().catch(() => video.classList.remove('playing'));
}

function update() {
  pending = false;
  const target = innerHeight * .52;
  const visible = sections.filter(section => {
    const rect = section.querySelector('.paper').getBoundingClientRect();
    return rect.bottom > 80 && rect.top < innerHeight;
  });
  const distance = section => {
    const rect = section.querySelector('.paper').getBoundingClientRect();
    return Math.abs(rect.top + rect.height / 2 - target);
  };
  const next = visible.reduce((best, section) => !best || distance(section) < distance(best) ? section : best, null);
  if (next !== current) {
    if (current && current.querySelector('video').src) finish(current);
    current = next;
    document.querySelectorAll('nav a').forEach(a => {
      if (next && a.hash === '#' + next.id) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
    start(current);
  }
  document.querySelector('#progress').style.width = 100 * scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight) + '%';
}

function schedule() {
  if (!pending) { pending = true; requestAnimationFrame(update); }
}

function setMotion(value) {
  enabled = value;
  motion.textContent = value ? 'Motion on' : 'Motion off';
  motion.setAttribute('aria-pressed', String(value));
  if (!value) sections.forEach(section => {
    if (section.querySelector('video').src) finish(section);
  });
  else start(current);
}

sections.forEach(section => {
  const video = section.querySelector('video');
  // Keep only the entrance. Canva's five-second exports also contain exits.
  const cutoff = () => Math.min(3, Number.isFinite(video.duration) ? video.duration : 3);
  video.onplaying = () => {
    if (current !== section || done.has(section) || document.hidden) video.pause();
    else video.classList.add('playing');
  };
  video.ontimeupdate = () => { if (video.currentTime >= cutoff()) finish(section); };
  video.onended = () => finish(section);
  video.onerror = () => finish(section);
  section.querySelector('.replay').onclick = () => {
    if (current && current !== section) finish(current);
    current = section;
    start(section, true);
  };
});
motion.onclick = () => setMotion(!enabled);
reduced.onchange = e => setMotion(!e.matches);
document.addEventListener('visibilitychange', () => {
  if (!current) return;
  if (document.hidden) current.querySelector('video').pause();
  else start(current);
});
document.querySelector('nav').onclick = e => {
  if (e.target.closest('a') && !wide.matches) menu.open = false;
};
addEventListener('scroll', schedule, {passive: true});
addEventListener('resize', schedule);
setMotion(enabled);
update();
