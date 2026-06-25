let products = [];
let currentCategory = 'all';

async function loadProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    grid.innerHTML = '<div class="loading">Загрузка...</div>';
    try {
        await initSupabase();
        products = await getProducts();
        console.log('Загружено товаров:', products.length);
        if (!products || products.length === 0) {
            grid.innerHTML = '<div class="empty-message">Товары не найдены.</div>';
            return;
        }
        applyFilters();
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        grid.innerHTML = '<div class="empty-message">Ошибка загрузки товаров.</div>';
    }
}

function applyFilters() {
    let filtered = products;
    if (currentCategory !== 'all') {
        filtered = products.filter(p => p.category === currentCategory);
    }
    const grid = document.getElementById('productsGrid');
    if (filtered.length === 0) {
        grid.innerHTML = '<div class="empty-message">Товары не найдены</div>';
        return;
    }
    
    let html = '';
    for (let i = 0; i < filtered.length; i++) {
        const p = filtered[i];
        const imgSrc = p.img && p.img.trim() !== '' ? p.img : 'https://placehold.co/400x200/e0e0e0/999?text=Фото';
        const discountPrice = p.discount ? Math.round(p.price * (100 - p.discount) / 100) : p.price;
        const inStock = (p.stock || 0) > 0;
        const stockText = inStock ? 'В наличии: ' + p.stock + ' шт.' : 'Нет в наличии';
        const stockColor = inStock ? '#2ecc71' : '#ff4757';
        
        html += '<div class="product-card">';
        if (p.discount) {
            html += '<span class="discount-badge">-' + p.discount + '%</span>';
        }
        html += '<img src="' + imgSrc + '" class="product-img" onerror="this.onerror=null; this.src=\'https://placehold.co/400x200/e0e0e0/999?text=Фото\'" alt="' + escapeHtml(p.name) + '">';
        html += '<div class="product-info">';
        html += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">';
        html += '<h3 class="product-title">' + escapeHtml(p.name) + '</h3>';
        if (p.discount) {
            html += '<span style="background:#ff4757;color:#fff;padding:4px 10px;border-radius:20px;font-size:0.7rem;font-weight:bold;">-' + p.discount + '%</span>';
        }
        html += '</div>';
        html += '<div class="product-price">';
        if (p.discount) {
            html += '<span class="old-price">' + p.price.toLocaleString() + ' KGS</span>';
        }
        html += '<span class="current-price ' + (p.discount ? 'discounted' : '') + '">' + discountPrice.toLocaleString() + ' KGS</span>';
        html += '</div>';
        html += '<div style="font-size:0.8rem;color:' + stockColor + ';margin-bottom:10px;">' + stockText + '</div>';
        html += '<button class="product-btn" onclick="handleAddToCartCatalog(' + p.id + ')"';
        if (!inStock) {
            html += ' disabled style="background:#ccc;cursor:not-allowed;"';
        }
        html += '>' + (inStock ? 'В корзину' : 'Нет в наличии') + '</button>';
        html += '</div>';
        html += '</div>';
    }
    grid.innerHTML = html;
}

function searchProducts() {
    const searchInput = document.querySelector('.search-input');
    if (!searchInput) return;
    const query = searchInput.value.toLowerCase().trim();
    if (!query) {
        applyFilters();
        return;
    }
    const filtered = products.filter(p => p.name.toLowerCase().includes(query));
    const grid = document.getElementById('productsGrid');
    if (filtered.length === 0) {
        grid.innerHTML = '<div class="empty-message">Ничего не найдено</div>';
        return;
    }
    
    let html = '';
    for (let i = 0; i < filtered.length; i++) {
        const p = filtered[i];
        const imgSrc = p.img && p.img.trim() !== '' ? p.img : 'https://placehold.co/400x200/e0e0e0/999?text=Фото';
        const discountPrice = p.discount ? Math.round(p.price * (100 - p.discount) / 100) : p.price;
        const inStock = (p.stock || 0) > 0;
        
        html += '<div class="product-card">';
        if (p.discount) {
            html += '<span class="discount-badge">-' + p.discount + '%</span>';
        }
        html += '<img src="' + imgSrc + '" class="product-img" onerror="this.onerror=null; this.src=\'https://placehold.co/400x200/e0e0e0/999?text=Фото\'" alt="' + escapeHtml(p.name) + '">';
        html += '<div class="product-info">';
        html += '<h3 class="product-title">' + escapeHtml(p.name) + '</h3>';
        html += '<div class="product-price">' + discountPrice.toLocaleString() + ' KGS</div>';
        html += '<button class="product-btn" onclick="handleAddToCartCatalog(' + p.id + ')"';
        if (!inStock) {
            html += ' disabled style="background:#ccc;cursor:not-allowed;"';
        }
        html += '>' + (inStock ? 'В корзину' : 'Нет в наличии') + '</button>';
        html += '</div>';
        html += '</div>';
    }
    grid.innerHTML = html;
}

function clearSearch() {
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.value = '';
    }
    applyFilters();
}

async function handleAddToCartCatalog(productId) {
    await initSupabase();
    const saved = localStorage.getItem('technomir_user');
    if (!saved) {
        window.location.href = 'login.html';
        return;
    }
    const success = await addToCart(productId);
    if (success) {
        showAddToCartToast();
    }
}

function showAddToCartToast() {
    let toast = document.getElementById('cartToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'cartToast';
        toast.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#3AAFA9;color:white;padding:12px 24px;border-radius:8px;z-index:9999;display:none;box-shadow:0 4px 15px rgba(0,0,0,0.2);animation:slideIn 0.3s ease;';
        document.body.appendChild(toast);
        const style = document.createElement('style');
        style.textContent = '@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }';
        document.head.appendChild(style);
    }
    toast.textContent = 'Товар добавлен в корзину!';
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 2000);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function setupFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentCategory = this.dataset.cat;
            applyFilters();
            const newUrl = currentCategory === 'all' ? 'catalog.html' : 'catalog.html?category=' + currentCategory;
            window.history.pushState({}, '', newUrl);
        });
    });
}

function setupSearch() {
    const searchBtn = document.querySelector('.search-btn');
    const searchInput = document.querySelector('.search-input');
    const clearBtn = document.querySelector('.clear-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', searchProducts);
    }
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchProducts();
            }
        });
    }
    if (clearBtn) {
        clearBtn.addEventListener('click', clearSearch);
    }
}

async function loadSiteSettings() {
    try {
        await initSupabase();
        if (!supabaseClient) {
            console.log('supabaseClient не инициализирован');
            return;
        }
        const { data: settings, error } = await supabaseClient.from('site_settings').select('*');
        if (error) {
            console.error('Ошибка загрузки:', error);
            return;
        }
        if (settings && settings.length > 0) {
            settings.forEach(s => {
                if (s.key === 'color_dark') document.documentElement.style.setProperty('--dark-blue', s.value);
                if (s.key === 'color_deep') document.documentElement.style.setProperty('--deep-teal', s.value);
                if (s.key === 'color_medium') document.documentElement.style.setProperty('--medium-teal', s.value);
                if (s.key === 'color_light') document.documentElement.style.setProperty('--light-teal', s.value);
                if (s.key === 'color_white') document.documentElement.style.setProperty('--white', s.value);
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
        }
    } catch (err) {
        console.error('Ошибка:', err);
    }
}

function initCatalog() {
    loadSiteSettings();
    loadProducts();
    setupFilters();
    setupSearch();
    const urlParams = new URLSearchParams(window.location.search);
    const categoryFromUrl = urlParams.get('category');
    if (categoryFromUrl) {
        currentCategory = categoryFromUrl;
        const activeBtn = document.querySelector('.filter-btn[data-cat="' + categoryFromUrl + '"]');
        if (activeBtn) {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            activeBtn.classList.add('active');
        }
    }
}

document.addEventListener('DOMContentLoaded', initCatalog);