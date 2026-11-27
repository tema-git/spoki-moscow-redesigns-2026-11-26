(() => {
  const section = document.querySelector('.photographs');
  const viewer = section?.querySelector('.photo-viewer');
  if (!viewer || typeof viewer.showModal !== 'function') return;

  const enlarged = new Image();
  const caption = viewer.querySelector('figcaption');
  let opener;

  section.addEventListener('click', event => {
    const frame = event.target.closest('[data-enlarge]');
    if (!frame || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    opener = frame;
    const thumbnail = frame.querySelector('img');
    enlarged.alt = thumbnail.alt;
    enlarged.width = Number(thumbnail.getAttribute('width'));
    enlarged.height = Number(thumbnail.getAttribute('height'));
    enlarged.src = frame.href;
    caption.textContent = frame.parentElement.querySelector('figcaption').textContent;
    caption.before(enlarged);
    viewer.showModal();
  });

  viewer.querySelector('.close-photo').addEventListener('click', () => viewer.close());
  viewer.addEventListener('click', event => {
    if (event.target === viewer) viewer.close();
  });
  viewer.addEventListener('close', () => {
    enlarged.remove();
    enlarged.removeAttribute('src');
    opener?.focus({preventScroll: true});
  });
})();
