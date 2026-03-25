/* AI Manifest — Shared Scripts
   Anti-spam, form handling, nav, scroll animations, Google Sheets backend
*/

(function() {
  'use strict';

  // ========== CONFIG ==========
  // Remplacer par l'URL du Google Apps Script déployé
  var GOOGLE_SHEETS_URL = 'https://formspree.io/f/xyzxyzxy';

  // ========== SCROLL ANIMATIONS ==========
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.fade-up').forEach(function(el) {
    observer.observe(el);
  });

  // ========== MOBILE NAV ==========
  var navToggle = document.querySelector('.nav-toggle');
  var navLinks = document.getElementById('navLinks');

  if (navToggle && navLinks) {
    navLinks.querySelectorAll('a').forEach(function(link) {
      link.addEventListener('click', function() {
        navLinks.classList.remove('open');
        navToggle.classList.remove('active');
      });
    });

    navToggle.addEventListener('click', function() {
      navLinks.classList.toggle('open');
      navToggle.classList.toggle('active');
    });

    document.addEventListener('click', function(e) {
      if (!navToggle.contains(e.target) && !navLinks.contains(e.target)) {
        navLinks.classList.remove('open');
        navToggle.classList.remove('active');
      }
    });
  }

  // ========== NAV SCROLL EFFECT ==========
  var nav = document.querySelector('.nav');
  if (nav) {
    window.addEventListener('scroll', function() {
      if (window.scrollY > 50) {
        nav.classList.add('nav-scrolled');
      } else {
        nav.classList.remove('nav-scrolled');
      }
    }, { passive: true });
  }

  // ========== FORM HANDLING ==========
  var formLoadTimes = new WeakMap();

  document.querySelectorAll('form').forEach(function(form) {
    formLoadTimes.set(form, Date.now());

    form.addEventListener('submit', function(e) {
      e.preventDefault();

      // --- Anti-spam: honeypot check ---
      var honeypot = form.querySelector('input[name="website"]');
      if (honeypot && honeypot.value !== '') {
        showFormSuccess(form, 'Merci !');
        return;
      }

      // --- Anti-spam: timing check (< 3 seconds = bot) ---
      var loadTime = formLoadTimes.get(form);
      if (loadTime && (Date.now() - loadTime) < 3000) {
        showFormSuccess(form, 'Merci !');
        return;
      }

      // --- Collect form data ---
      var formData = new FormData(form);
      formData.delete('website');

      var data = {};
      formData.forEach(function(value, key) {
        data[key] = value;
      });

      // Si domaine = "autre" et un champ précision existe, fusionner
      if (data.domaine === 'autre' && data.domaine_autre) {
        data.domaine = 'autre: ' + data.domaine_autre;
        delete data.domaine_autre;
      }

      // Add metadata
      data._source = window.location.pathname;
      data._submitted_at = new Date().toISOString();

      var btn = form.querySelector('button[type="submit"]');
      var originalText = btn.textContent;
      var prenom = form.querySelector('input[name="prenom"]');
      var prenomValue = prenom ? prenom.value : '';
      var email = form.querySelector('input[name="email"]');
      var emailValue = email ? email.value : '';

      // --- Determine confirmation message & form type ---
      var formId = form.closest('[id]');
      var sectionId = formId ? formId.id : '';
      var confirmMsg;
      var formType;

      if (sectionId === 'form-rejoindre') {
        confirmMsg = 'Bienvenue ' + prenomValue + ' ! Vous recevrez un email de confirmation.';
        formType = 'expert';
      } else if (sectionId === 'form-qualification') {
        confirmMsg = 'Merci ' + prenomValue + ' ! Un expert vous contacte rapidement.';
        formType = 'entreprise';
      } else {
        confirmMsg = 'Message envoy\u00e9 ! On revient vers vous rapidement.';
        formType = 'contact';
      }

      data._form_type = formType;

      // --- Submit to Google Sheets ---
      btn.textContent = 'Envoi en cours...';
      btn.disabled = true;

      if (GOOGLE_SHEETS_URL) {
        fetch(GOOGLE_SHEETS_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        .then(function() {
          // mode: no-cors = opaque response, on assume succès
          showFormSuccess(form, confirmMsg);
          form.reset();
          // Cacher le champ "autre" s'il était visible
          var autreWrap = form.querySelector('[id$="-domaine-autre-wrap"]');
          if (autreWrap) autreWrap.style.display = 'none';
          formLoadTimes.set(form, Date.now());
        })
        .catch(function() {
          showFormError(form, btn, originalText);
        });
      } else {
        // Pas de backend configuré — log + success
        console.log('[AI Manifest] Form data:', JSON.stringify(data, null, 2));
        showFormSuccess(form, confirmMsg);
        form.reset();
        var autreWrap = form.querySelector('[id$="-domaine-autre-wrap"]');
        if (autreWrap) autreWrap.style.display = 'none';
        formLoadTimes.set(form, Date.now());
      }
    });
  });

  function showFormSuccess(form, message) {
    var btn = form.querySelector('button[type="submit"]');
    var originalText = btn.textContent;
    btn.textContent = message;
    btn.style.background = '#22c55e';
    btn.style.color = '#fff';
    btn.disabled = true;
    btn.style.pointerEvents = 'none';

    setTimeout(function() {
      btn.textContent = originalText;
      btn.style.background = '';
      btn.style.color = '';
      btn.disabled = false;
      btn.style.pointerEvents = '';
    }, 5000);
  }

  function showFormError(form, btn, originalText) {
    btn.textContent = 'Erreur. R\u00e9essayez.';
    btn.style.background = '#ef4444';
    btn.style.color = '#fff';
    btn.disabled = false;

    setTimeout(function() {
      btn.textContent = originalText;
      btn.style.background = '';
      btn.style.color = '';
      btn.style.pointerEvents = '';
    }, 3000);
  }

})();
