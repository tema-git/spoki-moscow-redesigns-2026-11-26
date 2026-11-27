'use strict';
(() => {
  const dialog = document.getElementById('photos');
  const links = Array.from(document.querySelectorAll('[data-photo]'));
  const large = document.getElementById('photo-large');
  const label = document.getElementById('photo-label');
  const indexText = dialog.querySelector('.photo-index');
  const close = dialog.querySelector('.photo-close');
  let index = 0, opener;

  function show(next) {
    index = (next + links.length) % links.length;
    const link = links[index];
    const preview = link.querySelector('img');
    label.textContent = large.alt = preview.alt;
    indexText.textContent = (index + 1) + ' / ' + links.length;
    large.src = preview.currentSrc || preview.src;
    const original = new Image();
    original.onload = () => {
      if (dialog.open && links[index] === link) large.src = original.src;
    };
    original.src = link.href;
  }
  const multiple = links.length > 1;
  dialog.querySelector('.photo-controls').hidden = !multiple;
  links.forEach((link, i) => link.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    opener = link;
    dialog.showModal();
    show(i);
    close.focus({preventScroll:true});
  }));
  close.addEventListener('click', () => dialog.close());
  dialog.querySelector('.photo-prev').addEventListener('click', () => show(index - 1));
  dialog.querySelector('.photo-next').addEventListener('click', () => show(index + 1));
  dialog.addEventListener('keydown', event => {
    if (multiple && ['ArrowLeft','ArrowRight'].includes(event.key)) {
      event.preventDefault();
      show(index + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  dialog.addEventListener('click', event => {
    if (event.target === dialog || event.target.classList.contains('lightbox-view')) dialog.close();
  });
  dialog.addEventListener('close', () => {
    large.removeAttribute('src');
    opener?.focus({preventScroll:true});
  });
})();
