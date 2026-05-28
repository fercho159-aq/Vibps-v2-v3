document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Header Scroll Effect
    const header = document.getElementById('main-header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 100) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // 2. Mobile Menu Toggle
    const mobileMenu = document.getElementById('mobile-menu');
    const navMenu = document.getElementById('nav-menu');
    const navClose = document.getElementById('nav-close');

    const closeMenu = () => {
        navMenu.classList.remove('active');
        mobileMenu.querySelector('i').classList.add('fa-bars');
        mobileMenu.querySelector('i').classList.remove('fa-times');
    };

    mobileMenu.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        const icon = mobileMenu.querySelector('i');
        icon.classList.toggle('fa-bars');
        icon.classList.toggle('fa-times');
    });

    navClose.addEventListener('click', closeMenu);

    // Close menu when clicking a link
    navMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    // 3. Reveal on Scroll Animation
    const revealElements = document.querySelectorAll('.reveal');
    const revealOnScroll = () => {
        revealElements.forEach(el => {
            const windowHeight = window.innerHeight;
            const elementTop = el.getBoundingClientRect().top;
            const elementVisible = 150;
            
            if (elementTop < windowHeight - elementVisible) {
                el.classList.add('active');
            }
        });
    };
    
    window.addEventListener('scroll', revealOnScroll);
    revealOnScroll(); // Initial check

    // 4. Countdown Timer
    // Set target date (e.g., 30 days from now for demo)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 30);

    const updateCountdown = () => {
        const now = new Date().getTime();
        const distance = targetDate - now;

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        document.getElementById('days').innerText = days.toString().padStart(2, '0');
        document.getElementById('hours').innerText = hours.toString().padStart(2, '0');
        document.getElementById('minutes').innerText = minutes.toString().padStart(2, '0');
        document.getElementById('seconds').innerText = seconds.toString().padStart(2, '0');

        if (distance < 0) {
            clearInterval(timerInterval);
            document.getElementById('countdown').innerHTML = "<h3>¡EVENTO EN CURSO!</h3>";
        }
    };

    const timerInterval = setInterval(updateCountdown, 1000);
    updateCountdown();

    // 5. Contact Form Submission (Mock)
    const contactForm = document.getElementById('vibps-contact');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = contactForm.querySelector('button');
            const originalText = btn.innerText;
            
            btn.innerText = 'ENVIANDO...';
            btn.disabled = true;
            
            setTimeout(() => {
                alert('¡Propuesta enviada con éxito! Fernando se pondrá en contacto contigo pronto.');
                btn.innerText = originalText;
                btn.disabled = false;
                contactForm.reset();
            }, 1500);
        });
    }

    // 6. Smooth Scroll for Anchor Links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
});
