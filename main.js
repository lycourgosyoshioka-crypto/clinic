/* ===== ハンバーガーメニュー ===== */
(function() {
  var hamburger = document.getElementById('hamburgerBtn');
  var mobileMenu = document.getElementById('mobileMenu');
  var overlay = document.getElementById('mobileOverlay');

  if (!hamburger || !mobileMenu || !overlay) return;

  function toggleMenu() {
    var open = hamburger.getAttribute('aria-expanded') === 'true';
    hamburger.setAttribute('aria-expanded', String(!open));
    hamburger.classList.toggle('is-open');
    mobileMenu.classList.toggle('is-open');
    overlay.classList.toggle('is-open');
    document.body.classList.toggle('no-scroll');
  }

  hamburger.addEventListener('click', toggleMenu);
  overlay.addEventListener('click', toggleMenu);

  mobileMenu.querySelectorAll('a').forEach(function(link) {
    link.addEventListener('click', function() {
      if (mobileMenu.classList.contains('is-open')) toggleMenu();
    });
  });
})();

/* ===== 文字サイズ切替 ===== */
(function() {
  var ctrl = document.getElementById('fontsizeCtrl');
  if (!ctrl) return;
  var saved = localStorage.getItem('fontSize') || 'normal';
  if (saved === 'small' || saved === 'medium') saved = 'normal';

  function applySize(size) {
    document.documentElement.classList.remove('fs-normal', 'fs-large', 'fs-xlarge');
    document.documentElement.classList.add('fs-' + size);
    ctrl.querySelectorAll('.fontsize__btn').forEach(function(b) {
      b.classList.toggle('is-active', b.getAttribute('data-size') === size);
    });
    localStorage.setItem('fontSize', size);
  }

  applySize(saved);

  ctrl.addEventListener('click', function(e) {
    var btn = e.target.closest('.fontsize__btn');
    if (!btn) return;
    applySize(btn.getAttribute('data-size'));
  });
})();

/* ===== お知らせ取得（#newsList がある場合のみ実行） ===== */
(function() {
  var list = document.getElementById('newsList');
  if (!list) return;

  var API = 'https://ninomiya-clinic.microcms.io/api/v1/news';
  var KEY = 'hFBZemGlAksmqkQSGYzJ08sM2fnPqhrfJMN9';

  function formatDate(iso) {
    var d = new Date(iso);
    var y = d.getFullYear();
    var m = ('0' + (d.getMonth() + 1)).slice(-2);
    var day = ('0' + d.getDate()).slice(-2);
    return y + '.' + m + '.' + day;
  }

  function isoDate(iso) {
    return iso.slice(0, 10);
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function sanitizeHtml(html) {
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    tmp.querySelectorAll('script,style,iframe,object,embed').forEach(function(el) { el.remove(); });
    return tmp.innerHTML;
  }

  function toggleAccordion(li) {
    var body = li.querySelector('.news-item__body');
    if (!body) return;
    var isOpen = li.classList.contains('is-expanded');
    if (isOpen) {
      body.style.maxHeight = body.scrollHeight + 'px';
      requestAnimationFrame(function() { body.style.maxHeight = '0'; });
      li.classList.remove('is-expanded');
    } else {
      body.style.maxHeight = body.scrollHeight + 'px';
      li.classList.add('is-expanded');
      body.addEventListener('transitionend', function handler() {
        if (li.classList.contains('is-expanded')) body.style.maxHeight = 'none';
        body.removeEventListener('transitionend', handler);
      });
    }
  }

  fetch(API + '?limit=5&orders=-publishedAt', {
    headers: { 'X-MICROCMS-API-KEY': KEY }
  })
  .then(function(res) {
    if (!res.ok) throw new Error('API error: ' + res.status);
    return res.json();
  })
  .then(function(data) {
    if (!data.contents || data.contents.length === 0) {
      list.innerHTML = '<li class="news-item"><p class="news-item__text">現在お知らせはありません</p></li>';
      return;
    }

    list.innerHTML = '';

    data.contents.forEach(function(item) {
      var date = item.publishedAt || item.createdAt;
      var category = (item.category && item.category.name) ? item.category.name : 'お知らせ';
      var title = item.title || '';
      var content = item.content || '';
      var hasContent = content.trim().length > 0;

      var li = document.createElement('li');
      li.className = 'news-item' + (hasContent ? ' news-item--has-content' : '');

      var header = document.createElement('div');
      header.className = 'news-item__header';
      header.innerHTML =
        '<time class="news-item__date" datetime="' + isoDate(date) + '">' + formatDate(date) + '</time>'
        + '<span class="news-item__badge">' + escapeHtml(category) + '</span>'
        + '<p class="news-item__text">' + escapeHtml(title)
        + (hasContent ? ' <span class="news-item__toggle">＋</span>' : '')
        + '</p>';
      li.appendChild(header);

      if (hasContent) {
        var body = document.createElement('div');
        body.className = 'news-item__body';
        var inner = document.createElement('div');
        inner.className = 'news-item__content';
        inner.innerHTML = sanitizeHtml(content);
        body.appendChild(inner);
        li.appendChild(body);

        header.addEventListener('click', function() { toggleAccordion(li); });
      }

      list.appendChild(li);
    });
  })
  .catch(function() {
    list.innerHTML = '<li class="news-item"><p class="news-item__text">現在お知らせはありません</p></li>';
  });
})();

/* ===== スクロール表示アニメーション ===== */
(function() {
  var targets = document.querySelectorAll('.fade-in');
  if (!targets.length) return;

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    targets.forEach(function(el) { observer.observe(el); });
  } else {
    targets.forEach(function(el) { el.classList.add('is-visible'); });
  }
})();

/* ===== ヘッダースクロール制御 & トップへ戻るボタン ===== */
(function() {
  var header = document.querySelector('.header');
  var backToTop = document.getElementById('backToTop');
  var lastScrollY = window.scrollY;
  var ticking = false;

  function updateScroll() {
    var currentScrollY = window.scrollY;
    
    // トップへ戻るボタンの表示/非表示
    if (backToTop) {
      if (currentScrollY > 300) {
        backToTop.classList.add('is-visible');
      } else {
        backToTop.classList.remove('is-visible');
      }
    }

    // ヘッダーのスクロール制御 (下にスクロールで非表示、上で表示)
    if (header) {
      if (currentScrollY > lastScrollY && currentScrollY > 150) {
        // 下にスクロール
        header.classList.add('is-hidden');
      } else {
        // 上にスクロール
        header.classList.remove('is-hidden');
      }
    }

    lastScrollY = currentScrollY;
    ticking = false;
  }

  window.addEventListener('scroll', function() {
    if (!ticking) {
      window.requestAnimationFrame(updateScroll);
      ticking = true;
    }
  });

  if (backToTop) {
    backToTop.addEventListener('click', function() {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }
})();
