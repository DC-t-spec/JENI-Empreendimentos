(function () {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.getElementById('site-navigation');
  const header = document.querySelector('.premium-header');

  function closeMenu() {
    if (!toggle || !nav || !header) return;
    nav.classList.remove('is-open');
    header.classList.remove('is-mega-open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
  }

  if (toggle && nav && header) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      header.classList.toggle('is-mega-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('menu-open', open);
    });

    nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));

    document.addEventListener('click', (event) => {
      if (!header.contains(event.target)) closeMenu();
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) closeMenu();
    });
  }

  const reveals = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

  reveals.forEach((el) => observer.observe(el));
}());
