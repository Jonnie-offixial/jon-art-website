// ========== API Configuration ==========
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api'
    : 'https://your-app.onrender.com/api';  // UPDATE AFTER DEPLOYING

// ========== Loading Screen ==========
document.addEventListener('DOMContentLoaded', () => {
    // Hide loading screen immediately when DOM is ready
    const loadingScreen = document.querySelector('.loading-screen');
    if (loadingScreen) {
        loadingScreen.classList.add('fade-out');
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 300); // Reduced from 500ms for faster perceived load
    }
});

// Keep window load event for any final cleanup if needed
window.addEventListener('load', () => {
    // Any final optimizations after all resources load
    console.log('Page fully loaded');
});

// ========== Load Artworks from Supabase ==========
async function loadArtworks() {
    try {
        const response = await fetch(`${API_BASE}/artworks`);
        if (!response.ok) throw new Error('Failed to load artworks');
        
        const artworks = await response.json();
        displayArtworks(artworks);
    } catch (error) {
        console.error('Error loading artworks:', error);
        displayFallbackArtworks();
    }
}

function displayArtworks(artworks) {
    const galleryGrid = document.getElementById('gallery-grid');
    if (!galleryGrid) return;
    
    if (!artworks.length) {
        galleryGrid.innerHTML = '<p style="text-align:center;">Artworks coming soon...</p>';
        return;
    }
    
    galleryGrid.innerHTML = artworks.map(art => `
        <div class="art-card" onclick="openLightbox('${art.image_url || '/public/images/placeholder.jpg'}', '${art.title}')">
            <img src="${art.image_url || '/public/images/placeholder.jpg'}" alt="${art.title}" class="art-image" loading="lazy">
            <div class="art-info">
                <h3 class="art-title">${escapeHtml(art.title)}</h3>
                <div class="art-medium">${escapeHtml(art.medium || 'Oil on Canvas')}</div>
                <p class="art-description">${escapeHtml(art.description || '')}</p>
                ${art.price ? `<div class="art-price">$${art.price.toLocaleString()}</div>` : ''}
            </div>
        </div>
    `).join('');
}

function displayFallbackArtworks() {
    const fallbackArtworks = [
        { title: 'Midnight Solitude', medium: 'Oil on Canvas', description: 'A contemplative portrait capturing the essence of quiet reflection.', image_url: 'https://placehold.co/600x800/1a1a1a/d4af37?text=Portrait+1' },
        { title: 'Gilded Reflection', medium: 'Oil on Linen', description: 'Golden hour light dancing across contemplative features.', image_url: 'https://placehold.co/600x800/1a1a1a/d4af37?text=Portrait+2' },
        { title: 'Eternal Gaze', medium: 'Charcoal & Graphite', description: 'Intricate study of expression and emotion.', image_url: 'https://placehold.co/600x800/1a1a1a/d4af37?text=Portrait+3' }
    ];
    displayArtworks(fallbackArtworks);
}

// ========== Lightbox Functionality ==========
function openLightbox(imageUrl, title) {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-image');
    const lightboxTitle = document.getElementById('lightbox-title');
    
    if (lightboxImg) lightboxImg.src = imageUrl;
    if (lightboxTitle) lightboxTitle.textContent = title;
    if (lightbox) lightbox.classList.add('active');
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (lightbox) lightbox.classList.remove('active');
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
});

// ========== Commission Form ==========
async function submitCommission(event) {
    event.preventDefault();
    const form = event.target;
    const formData = {
        name: form.name?.value,
        email: form.email?.value,
        phone: form.phone?.value,
        artStyle: form.artStyle?.value,
        description: form.description?.value,
        budget: form.budget?.value,
        timeline: form.timeline?.value
    };
    
    // Handle reference image upload
    const referenceFile = form.referenceImage?.files[0];
    let referenceImageUrl = null;
    
    if (referenceFile) {
        const uploadData = new FormData();
        uploadData.append('image', referenceFile);
        
        const uploadRes = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            body: uploadData
        });
        
        if (uploadRes.ok) {
            const uploadResult = await uploadRes.json();
            referenceImageUrl = uploadResult.url;
        }
    }
    
    const response = await fetch(`${API_BASE}/commissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, referenceImage: referenceImageUrl })
    });
    
    if (response.ok) {
        alert('Commission request submitted! Jon will review and respond within 48 hours.');
        form.reset();
    } else {
        alert('Something went wrong. Please try again or email jon@jonartgalleries.com directly.');
    }
}

// ========== Contact Form ==========
async function submitContact(event) {
    event.preventDefault();
    const form = event.target;
    const formData = {
        name: form.name?.value,
        email: form.email?.value,
        subject: form.subject?.value,
        message: form.message?.value
    };
    
    const response = await fetch(`${API_BASE}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
    });
    
    if (response.ok) {
        alert('Message sent successfully! Jon will reply within 24 hours.');
        form.reset();
    } else {
        alert('Failed to send message. Please try again.');
    }
}

// ========== Newsletter Signup ==========
async function submitNewsletter(event) {
    event.preventDefault();
    const email = event.target.querySelector('input[type="email"]')?.value;
    
    if (!email) return;
    
    const response = await fetch(`${API_BASE}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    });
    
    if (response.ok) {
        alert('Subscribed successfully! Check your inbox for confirmation.');
        event.target.reset();
    } else {
        const error = await response.json();
        alert(error.error || 'Subscription failed. Please try again.');
    }
}

// ========== Studio Booking ==========
async function submitStudioBooking(event) {
    event.preventDefault();
    const form = event.target;
    const formData = {
        name: form.name?.value,
        email: form.email?.value,
        phone: form.phone?.value,
        preferredDate: form.preferredDate?.value,
        preferredTime: form.preferredTime?.value,
        visitPurpose: form.visitPurpose?.value
    };
    
    const response = await fetch(`${API_BASE}/studio-visits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
    });
    
    if (response.ok) {
        alert('Booking request sent! Jon will confirm availability within 24 hours.');
        form.reset();
    } else {
        alert('Booking failed. Please try again or call directly.');
    }
}

// ========== Gift Card Purchase ==========
const UGX_EXCHANGE_RATE = 3800; // Approximate exchange rate from USD to UGX
let selectedGiftCardCurrency = 'USD';
let selectedGiftCardAmount = null;
let selectedGiftCardRawAmount = null;

function selectGiftCardCurrency(currency) {
    selectedGiftCardCurrency = currency;
    selectedGiftCardAmount = null;
    selectedGiftCardRawAmount = null;
    document.querySelectorAll('.currency-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.currency === currency);
    });
    document.querySelectorAll('.gift-card-btn').forEach(btn => {
        const value = btn.dataset.value;
        if (value === 'custom') return;
        const amountValue = Number(value);
        btn.textContent = currency === 'USD'
            ? `Buy $${amountValue}`
            : `Buy UGX ${Math.round(amountValue * UGX_EXCHANGE_RATE).toLocaleString()}`;
        btn.classList.remove('selected');
    });

    const customInput = document.getElementById('custom-amount');
    const customValue = document.getElementById('custom-amount-value');
    if (customInput) customInput.style.display = 'none';
    if (customValue) customValue.placeholder = currency === 'USD' ? 'Enter amount in USD' : 'Enter amount in UGX';
}

function selectGiftCardAmount(amount) {
    selectedGiftCardRawAmount = amount;
    document.querySelectorAll('.gift-card-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.value === String(amount));
    });

    const customInput = document.getElementById('custom-amount');
    if (customInput) customInput.style.display = amount === 'custom' ? 'block' : 'none';

    if (amount === 'custom') {
        selectedGiftCardAmount = 'custom';
        return;
    }

    const numericValue = Number(amount);
    selectedGiftCardAmount = selectedGiftCardCurrency === 'USD'
        ? numericValue
        : Math.round(numericValue * UGX_EXCHANGE_RATE);
}

async function purchaseGiftCard() {
    let amount = selectedGiftCardAmount;
    const customInput = document.getElementById('custom-amount-value');

    if (amount === 'custom' && customInput) {
        amount = parseFloat(customInput.value);
        const minAmount = selectedGiftCardCurrency === 'USD' ? 10 : 10000;
        if (isNaN(amount) || amount < minAmount) {
            alert(`Please enter a valid amount (minimum ${selectedGiftCardCurrency === 'USD' ? '$10' : 'UGX 10,000'})`);
            return;
        }
    }

    if (!amount) {
        alert('Please select a gift card amount');
        return;
    }

    const recipientName = prompt('Enter recipient name for the gift card:');
    if (!recipientName) return;

    const recipientEmail = prompt('Enter recipient email address:');
    if (!recipientEmail) return;

    const senderName = prompt('Your name (for the gift message):');
    const giftMessage = prompt('Gift message (optional):');

    const response = await fetch(`${API_BASE}/gift-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            amount,
            currency: selectedGiftCardCurrency,
            recipient_name: recipientName,
            recipient_email: recipientEmail,
            sender_name: senderName || 'Anonymous',
            personal_message: giftMessage || ''
        })
    });

    if (response.ok) {
        alert(`Gift card purchased! A digital gift card has been sent to ${recipientEmail}`);
    } else {
        alert('Purchase failed. Please try again.');
    }
}

// ========== Cookie Consent ==========
function initCookieBanner() {
    const consent = localStorage.getItem('cookieConsent');
    const banner = document.getElementById('cookie-banner');
    
    if (!consent && banner) {
        setTimeout(() => {
            banner.classList.add('active');
        }, 1500);
    }
    
    window.acceptCookies = function() {
        localStorage.setItem('cookieConsent', 'accepted');
        const banner = document.getElementById('cookie-banner');
        if (banner) banner.classList.remove('active');
    };
    
    window.declineCookies = function() {
        localStorage.setItem('cookieConsent', 'declined');
        const banner = document.getElementById('cookie-banner');
        if (banner) banner.classList.remove('active');
    };
}

// ========== Scroll Animation ==========
function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal');
    
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    
    reveals.forEach(el => revealObserver.observe(el));
}

// ========== Active Nav Highlighting ==========
function initNavHighlighting() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a');
    
    const observer = new IntersectionObserver((entries) => {
        let current = '';
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                current = entry.target.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            if (href === `#${current}`) {
                link.classList.add('active');
            }
        });
    }, { threshold: 0.5 });
    
    sections.forEach(section => observer.observe(section));
}

// ========== Mobile Menu ==========
function initMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    
    if (menuBtn && navLinks) {
        menuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }
}

// ========== Helper: Escape HTML ==========
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ========== Initialize Everything ==========
document.addEventListener('DOMContentLoaded', () => {
    loadArtworks();
    initCookieBanner();
    initScrollReveal();
    initNavHighlighting();
    initMobileMenu();
});