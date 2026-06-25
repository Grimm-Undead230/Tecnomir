let currentIndex = 0;
let autoPlay;

async function checkAuth() {
    await initSupabase();
    const saved = localStorage.getItem('technomir_user');
    const currentUser = saved ? JSON.parse(saved) : null;
    if (currentUser) {
        document.getElementById('loginBtn').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'block';
        if (currentUser.role === 'admin') {
            document.body.insertAdjacentHTML('beforeend', 
                '<div style="position:fixed;top:20px;right:20px;background:#3AAFA9;color:#fff;padding:5px 15px;border-radius:20px;font-size:12px;z-index:9999;">Админ</div>'
            );
        }
    }
}

window.logout = function() {
    localStorage.removeItem('technomir_user');
    location.reload();
};

window.handleAddToCart = async function(productId) {
    await initSupabase();
    const saved = localStorage.getItem('technomir_user');
    if (!saved) {
        window.location.href = 'login.html';
        return;
    }
    const success = await addToCart(productId);
    if (success) {
        showAddToCartNotification();
    }
};

function showAddToCartNotification() {
    const oldNotif = document.getElementById('cartNotification');
    if (oldNotif) oldNotif.remove();

    const notif = document.createElement('div');
    notif.id = 'cartNotification';
    notif.innerHTML = '<div style="display:flex;align-items:center;gap:12px;"><span></span><span>Товар добавлен в корзину!</span></div>';
    notif.style.cssText = `
        position: fixed; bottom: 30px; right: 30px; background: #17252A;
        color: white; padding: 14px 24px; border-radius: 12px;
        z-index: 10000; box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        animation: slideInRight 0.3s ease; border-left: 4px solid #3AAFA9;
    `;
    document.body.appendChild(notif);
    setTimeout(() => {
        notif.style.opacity = '0';
        setTimeout(() => notif.remove(), 300);
    }, 2000);
}

async function loadSiteSettings() {
    try {
        await initSupabase();
        if (!supabaseClient) {
            console.log('supabaseClient не инициализирован');
            return;
        }
        const { data: settings, error } = await supabaseClient
            .from('site_settings')
            .select('*');
        if (error) {
            console.error('Ошибка загрузки настроек:', error);
            return;
        }
        if (settings && settings.length > 0) {
            settings.forEach(s => {
                if (s.key === 'color_dark') {
                    document.documentElement.style.setProperty('--dark-blue', s.value);
                }
                if (s.key === 'color_deep') {
                    document.documentElement.style.setProperty('--deep-teal', s.value);
                }
                if (s.key === 'color_medium') {
                    document.documentElement.style.setProperty('--medium-teal', s.value);
                }
                if (s.key === 'color_light') {
                    document.documentElement.style.setProperty('--light-teal', s.value);
                }
                if (s.key === 'color_white') {
                    document.documentElement.style.setProperty('--white', s.value);
                }
                if (s.key === 'carousel_title') {
                    const titles = document.querySelectorAll('.section-title');
                    titles.forEach(el => {
                        if (el.closest('.categories-carousel')) {
                            el.innerText = s.value;
                        }
                    });
                }
                if (s.key === 'phone1') {
                    const phones = document.querySelectorAll('.contact-phone');
                    if (phones[0]) phones[0].innerText = s.value;
                }
                if (s.key === 'phone2') {
                    const phones = document.querySelectorAll('.contact-phone');
                    if (phones[1]) phones[1].innerText = s.value;
                }
                if (s.key === 'copyright') {
                    const footer = document.querySelector('.footer-bottom p');
                    if (footer) footer.innerText = s.value;
                }
            });
            console.log('Настройки сайта загружены и применены');
        }
    } catch (err) {
        console.error('Ошибка загрузки настроек:', err);
    }
}

async function loadCarouselFromDB() {
    try {
        await initSupabase();
        if (!supabaseClient) return;
        const { data: carousel, error } = await supabaseClient
            .from('carousel')
            .select('*')
            .order('sort_order');
        if (error) {
            console.error('Ошибка загрузки карусели:', error);
            return;
        }
        if (carousel && carousel.length > 0) {
            const slides = document.querySelectorAll('.carousel-slide');
            carousel.forEach((slide, i) => {
                if (slides[i]) {
                    const title = slides[i].querySelector('.slide-content h3');
                    const text = slides[i].querySelector('.slide-content p');
                    const img = slides[i].querySelector('.carousel-image');
                    if (title) title.innerText = slide.title;
                    if (text) text.innerText = slide.text;
                    if (img) img.src = slide.img;
                }
            });
            console.log('Карусель загружена из БД');
        }
    } catch (err) {
        console.error('Ошибка загрузки карусели:', err);
    }
}

async function loadDiscounts() {
    await initSupabase();
    const products = await getProducts();
    const discounted = products.filter(p => p.discount > 0).slice(0, 4);
    const grid = document.getElementById('discountGrid');
    if (grid) {
        if (discounted.length === 0) {
            grid.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">Нет товаров со скидкой</div>';
            return;
        }
        grid.innerHTML = discounted.map(p => {
            const discountPrice = Math.round(p.price * (100 - p.discount) / 100);
            return `
                <div class="product-card">
                    <img src="${p.img}" style="width:100%;height:180px;object-fit:cover" 
                         onerror="this.src='https://placehold.co/400x200/e0e0e0/999?text=Фото'">
                    <div class="product-info">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                            <h3 style="font-size:1rem">${escapeHtml(p.name)}</h3>
                            <span style="background:#ff4757;color:#fff;padding:4px 10px;border-radius:20px;font-size:0.7rem">-${p.discount}%</span>
                        </div>
                        <div>
                            <span style="text-decoration:line-through;color:#999;font-size:0.9rem">${p.price.toLocaleString()} KGS</span>
                            <span style="font-size:1.3rem;font-weight:700;color:#e67e22;margin-left:8px">${discountPrice.toLocaleString()} KGS</span>
                        </div>
                        <button onclick="handleAddToCart(${p.id})" style="width:100%;margin-top:12px;padding:10px;background:#3AAFA9;color:#fff;border:none;border-radius:8px;cursor:pointer">В корзину</button>
                    </div>
                </div>
            `;
        }).join('');
    }
}

function initCarousel() {
    const track = document.getElementById('carouselTrack');
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.dot');
    const prevBtn = document.querySelector('.carousel-arrow.prev');
    const nextBtn = document.querySelector('.carousel-arrow.next');

    if (!track || slides.length === 0) return;

    function updateCarousel() {
        track.style.transform = `translateX(-${currentIndex * 100}%)`;
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === currentIndex);
        });
    }

    function nextSlide() {
        currentIndex = (currentIndex + 1) % slides.length;
        updateCarousel();
    }

    function prevSlide() {
        currentIndex = (currentIndex - 1 + slides.length) % slides.length;
        updateCarousel();
    }

    if (prevBtn) prevBtn.onclick = prevSlide;
    if (nextBtn) nextBtn.onclick = nextSlide;
    dots.forEach((dot, i) => dot.onclick = () => { currentIndex = i; updateCarousel(); });

    if (autoPlay) clearInterval(autoPlay);
    autoPlay = setInterval(nextSlide, 5000);
    const wrapper = document.querySelector('.carousel-wrapper');
    if (wrapper) {
        wrapper.onmouseenter = () => clearInterval(autoPlay);
        wrapper.onmouseleave = () => { autoPlay = setInterval(nextSlide, 5000); };
    }
    updateCarousel();
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadSiteSettings();
    await loadCarouselFromDB();
    await checkAuth();
    setTimeout(loadDiscounts, 500);
    setTimeout(initCarousel, 100);
});