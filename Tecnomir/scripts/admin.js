let products = [];
let carouselData = [];
let allOrders = [];
let currentFilter = 'all';

function showToast(msg, isError = false) {
    const toast = document.getElementById('toast');
    toast.innerText = msg;
    toast.className = 'toast ' + (isError ? 'error' : 'success');
    setTimeout(() => { toast.classList.add('show'); }, 10);
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => { toast.classList.remove('show'); }, 2500);
}

window.logout = function() {
    localStorage.removeItem('technomir_user');
    window.location.href = 'index.html';
};

function showConfirmModal(options) {
    const oldModal = document.getElementById('confirmModal');
    if (oldModal) oldModal.remove();
    const modal = document.createElement('div');
    modal.id = 'confirmModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.6); display: flex; justify-content: center;
        align-items: center; z-index: 100000; animation: fadeIn 0.3s ease;
        backdrop-filter: blur(4px);
    `;
    modal.innerHTML = `
        <div style="background:white;border-radius:20px;padding:35px 40px 30px;max-width:420px;width:92%;text-align:center;animation:scaleIn 0.3s ease;box-shadow:0 25px 60px rgba(0,0,0,0.3);">
            <div style="width:70px;height:70px;border-radius:50%;background:#fff3e0;display:flex;justify-content:center;align-items:center;margin:0 auto 20px;font-size:36px;">!</div>
            <h3 style="font-size:1.3rem;color:#17252A;margin-bottom:10px;font-weight:700;">${options.title || 'Подтверждение'}</h3>
            <p style="color:#666;font-size:1rem;line-height:1.5;margin-bottom:25px;">${options.message}</p>
            <div style="display:flex;gap:12px;justify-content:center;">
                <button class="confirm-cancel" style="background:#f0f0f0;color:#555;border:none;padding:12px 30px;border-radius:12px;cursor:pointer;font-weight:600;font-size:0.95rem;flex:1;">${options.cancelText || 'Отмена'}</button>
                <button class="confirm-yes" style="background:#3AAFA9;color:white;border:none;padding:12px 30px;border-radius:12px;cursor:pointer;font-weight:600;font-size:0.95rem;flex:1;">${options.confirmText || 'Да'}</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    if (!document.getElementById('confirmModalStyles')) {
        const styles = document.createElement('style');
        styles.id = 'confirmModalStyles';
        styles.textContent = `@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes scaleIn{from{transform:scale(0.9);opacity:0}to{transform:scale(1);opacity:1}}`;
        document.head.appendChild(styles);
    }
    const closeModal = () => {
        modal.style.opacity = '0';
        setTimeout(() => modal.remove(), 300);
    };
    modal.querySelector('.confirm-cancel').onclick = () => { closeModal(); if (options.onCancel) options.onCancel(); };
    modal.querySelector('.confirm-yes').onclick = () => { closeModal(); if (options.onConfirm) options.onConfirm(); };
    modal.onclick = (e) => { if (e.target === modal) { closeModal(); if (options.onCancel) options.onCancel(); } };
    const keyHandler = (e) => { if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', keyHandler); if (options.onCancel) options.onCancel(); } };
    document.addEventListener('keydown', keyHandler);
}

async function uploadImageFile(file) {
    try {
        const ext = file.name.split('.').pop();
        const fileName = Date.now() + '_' + Math.random().toString(36).substring(7) + '.' + ext;
        const filePath = 'products/' + fileName;
        const { error } = await supabaseClient.storage.from('images').upload(filePath, file);
        if (error) {
            console.error('Ошибка загрузки:', error);
            showToast('Ошибка загрузки: ' + error.message, true);
            return null;
        }
        const { data: urlData } = supabaseClient.storage.from('images').getPublicUrl(filePath);
        return urlData.publicUrl;
    } catch (err) {
        console.error('Ошибка:', err);
        showToast('Ошибка загрузки', true);
        return null;
    }
}

function addImageUploadToRow(rowIndex) {
    const rows = document.querySelectorAll('#tableBody tr');
    if (rowIndex >= rows.length) return;
    const row = rows[rowIndex];
    const imgCell = row.querySelector('td:nth-child(2)');
    if (!imgCell) return;
    const oldInput = imgCell.querySelector('.upload-input');
    if (oldInput) oldInput.remove();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.className = 'upload-input';
    input.style.cssText = 'margin-top:5px;font-size:0.7rem;width:100%;';
    input.onchange = async function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const img = imgCell.querySelector('img');
        const hidden = document.getElementById(`img_${rowIndex}`);
        if (!img || !hidden) return;
        img.style.opacity = '0.5';
        img.alt = 'Загрузка...';
        const url = await uploadImageFile(file);
        if (url) {
            img.src = url;
            img.style.opacity = '1';
            img.alt = 'Фото';
            hidden.value = url;
            showToast('Изображение загружено');
        } else {
            img.style.opacity = '1';
        }
    };
    imgCell.appendChild(input);
}

async function loadCatalog() {
    try {
        await initSupabase();
        if (!currentUser || currentUser.role !== 'admin') {
            alert('Доступ только администратору');
            window.location.href = 'index.html';
            return;
        }
        document.getElementById('userEmail').innerText = currentUser?.username || 'Админ';
        products = await getProducts();
        console.log('Загружено товаров:', products.length);
        renderTable();
    } catch (err) {
        console.error('Ошибка загрузки каталога:', err);
        showToast('Ошибка загрузки каталога', true);
    }
}

function escapeHtml(s) {
    if (!s) return '';
    return s.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

function renderTable() {
    const tbody = document.getElementById('tableBody');
    if (!products || products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#999;padding:30px;">Нет товаров. Добавьте первый.</td></tr>';
        return;
    }
    tbody.innerHTML = products.map((p, i) => `
        <tr>
            <td>${p.id}</td>
            <td>
                <img src="${p.img}" class="product-img" onerror="this.src='https://placehold.co/50x50/e0e0e0/999?text=Фото'">
                <input type="hidden" id="img_${i}" value="${p.img}">
            </td>
            <td><input id="n${i}" value="${escapeHtml(p.name)}" style="min-width:200px;"></td>
            <td><input id="pr${i}" type="number" value="${p.price}" style="width:100px;"></td>
            <td><input id="disc${i}" type="number" value="${p.discount || 0}" style="width:70px;" placeholder="%"></td>
            <td><input id="stock${i}" type="number" value="${p.stock || 0}" style="width:70px;" min="0"></td>
            <td>
                <select id="cat${i}">
                    <option ${p.category === 'components' ? 'selected' : ''} value="components">Комплектующие</option>
                    <option ${p.category === 'periphery' ? 'selected' : ''} value="periphery">Периферия</option>
                    <option ${p.category === 'cctv' ? 'selected' : ''} value="cctv">Видеонаблюдение</option>
                    <option ${p.category === 'laptops' ? 'selected' : ''} value="laptops">Ноутбуки</option>
                </select>
            </td>
            <td><button class="btn-delete" onclick="deleteProductHandler(${p.id})">Удалить</button></td>
        </tr>
    `).join('');
    setTimeout(() => {
        for (let i = 0; i < products.length; i++) {
            addImageUploadToRow(i);
        }
    }, 100);
}

async function saveAll() {
    try {
        for (let i = 0; i < products.length; i++) {
            const imgUrl = document.getElementById(`img_${i}`)?.value || products[i].img;
            await updateProduct(products[i].id, {
                name: document.getElementById(`n${i}`).value,
                price: parseInt(document.getElementById(`pr${i}`).value),
                category: document.getElementById(`cat${i}`).value,
                img: imgUrl,
                stock: parseInt(document.getElementById(`stock${i}`).value) || 0
            });
            const discount = parseInt(document.getElementById(`disc${i}`).value) || 0;
            await updateProductDiscount(products[i].id, discount);
        }
        showToast('Товары сохранены');
        await loadCatalog();
    } catch (err) {
        console.error('Ошибка сохранения:', err);
        showToast('Ошибка сохранения товаров', true);
    }
}

window.deleteProductHandler = async function(id) {
    showConfirmModal({
        title: 'Удаление товара',
        message: 'Вы уверены, что хотите удалить этот товар? Это действие нельзя отменить.',
        confirmText: 'Удалить',
        cancelText: 'Отмена',
        onConfirm: async () => {
            const success = await deleteProduct(id);
            if (success) { showToast('Товар удалён'); await loadCatalog(); } 
            else { showToast('Ошибка удаления', true); }
        }
    });
};

async function loadOrdersAdmin() {
    try {
        await initSupabase();
        const { data, error } = await supabaseClient.from('orders').select('*').order('created_at', { ascending: false });
        if (error) { console.error('Ошибка загрузки заказов:', error); showToast('Ошибка загрузки заказов', true); return; }
        allOrders = data || [];
        updateStats();
        renderOrdersList();
        console.log('Загружено заказов:', allOrders.length);
    } catch (err) { console.error('Ошибка:', err); showToast('Ошибка загрузки заказов', true); }
}

function updateStats() {
    const total = allOrders.length;
    const newCount = allOrders.filter(o => o.status === 'новый').length;
    const processingCount = allOrders.filter(o => o.status === 'processing').length;
    const cancelledCount = allOrders.filter(o => o.status === 'cancelled').length;
    document.getElementById('totalOrders').textContent = total;
    document.getElementById('newOrders').textContent = newCount;
    document.getElementById('processingOrders').textContent = processingCount;
    document.getElementById('cancelledOrders').textContent = cancelledCount;
}

window.filterOrders = function() {
    const select = document.getElementById('statusFilter');
    currentFilter = select.value;
    renderOrdersList();
};

function renderOrdersList() {
    const container = document.getElementById('ordersList');
    let filtered = allOrders;
    if (currentFilter !== 'all') filtered = allOrders.filter(o => o.status === currentFilter);
    if (filtered.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:40px;background:#fff;border-radius:12px;color:#999;"><p style="font-size:2rem;margin-bottom:10px;">Нет заказов</p></div>`;
        return;
    }
    container.innerHTML = filtered.map(order => {
        const items = order.items || [];
        const date = new Date(order.created_at).toLocaleString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        const statusMap = { 'новый': { text: 'Новый', class: 'status-new' }, 'processing': { text: 'В обработке', class: 'status-processing' }, 'cancelled': { text: 'Отменён', class: 'status-cancelled' } };
        const statusInfo = statusMap[order.status] || statusMap['новый'];
        const previewItems = items.slice(0, 3);
        const moreCount = items.length - 3;
        const previewHtml = previewItems.map(item => `<div class="preview-item"><img src="${item.img || 'https://placehold.co/30x30'}" onerror="this.src='https://placehold.co/30x30'"><span>${escapeHtml(item.name)} x ${item.quantity}</span></div>`).join('');
        let statusButtons = '';
        if (order.status === 'новый') {
            statusButtons = `
                <button class="btn-status btn-status-processing" onclick="updateOrderStatus(${order.id}, 'processing')">В обработку</button>
                <button class="btn-status btn-status-cancelled" onclick="updateOrderStatus(${order.id}, 'cancelled')">Отменить</button>
            `;
        } else if (order.status === 'processing') {
            statusButtons = `<button class="btn-status btn-status-cancelled" onclick="updateOrderStatus(${order.id}, 'cancelled')">Отменить</button>`;
        }
        return `
            <div class="order-card-admin ${statusInfo.class}">
                <div class="order-header-admin">
                    <div><span class="order-id">Заказ ${order.order_number}</span><span class="order-user">ID: ${order.user_id}</span></div>
                    <div><span class="order-date">${date}</span><span class="order-status-badge ${statusInfo.class}">${statusInfo.text}</span></div>
                </div>
                <div class="order-products-preview">${previewHtml}${moreCount > 0 ? `<span style="color:#888;font-size:0.85rem;">+ еще ${moreCount}</span>` : ''}</div>
                <div class="order-total-admin">${order.total_amount.toLocaleString()} KGS</div>
                <div class="order-actions-admin">
                    <button class="btn btn-view" onclick="viewOrder(${order.id})">Просмотр</button>
                    ${statusButtons}
                </div>
            </div>
        `;
    }).join('');
}

window.updateOrderStatus = async function(orderId, newStatus) {
    const statusNames = { 'новый': 'Новый', 'processing': 'В обработке', 'cancelled': 'Отменён' };
    const messages = { 'processing': 'Перевести заказ в статус "В обработке"?', 'cancelled': 'Отменить этот заказ? Это нельзя отменить.' };
    showConfirmModal({
        title: 'Изменение статуса',
        message: messages[newStatus] || 'Изменить статус заказа?',
        confirmText: 'Подтвердить',
        cancelText: 'Отмена',
        onConfirm: async () => {
            const { error } = await supabaseClient.from('orders').update({ status: newStatus }).eq('id', orderId);
            if (error) { showToast('Ошибка обновления', true); return; }
            showToast('Статус изменён на "' + statusNames[newStatus] + '"');
            await loadOrdersAdmin();
        }
    });
};

window.viewOrder = function(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) { showToast('Заказ не найден', true); return; }
    const items = order.items || [];
    const date = new Date(order.created_at).toLocaleString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const statusNames = { 'новый': 'Новый', 'processing': 'В обработке', 'cancelled': 'Отменён' };
    document.getElementById('modalOrderTitle').textContent = 'Заказ ' + order.order_number;
    const productsHtml = items.map(item => `
        <div class="modal-product-item">
            <img src="${item.img || 'https://placehold.co/50x50'}" onerror="this.src='https://placehold.co/50x50'">
            <div class="product-info">
                <div class="product-name">${escapeHtml(item.name)}</div>
                <div class="product-details">${item.price.toLocaleString()} KGS x ${item.quantity} = ${(item.price * item.quantity).toLocaleString()} KGS</div>
            </div>
        </div>
    `).join('');
    document.getElementById('modalOrderBody').innerHTML = `
        <div class="modal-order-info">
            <p><strong>Дата:</strong> ${date}</p>
            <p><strong>Пользователь:</strong> ID ${order.user_id}</p>
            <p><strong>Статус:</strong> ${statusNames[order.status] || order.status}</p>
        </div>
        <h4 style="margin:15px 0 10px;color:#17252A;">Товары:</h4>
        <div class="modal-products">${productsHtml}</div>
        <div class="modal-total">Итого: ${order.total_amount.toLocaleString()} KGS</div>
    `;
    document.getElementById('orderModal').classList.add('show');
};

window.closeOrderModal = function() { document.getElementById('orderModal').classList.remove('show'); };
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('orderModal');
    if (modal) modal.addEventListener('click', function(e) { if (e.target === this) closeOrderModal(); });
});

async function loadColors() {
    try {
        const settings = await getSiteSettings();
        settings.forEach(x => {
            if (x.key === 'color_dark') document.getElementById('cDark').value = x.value;
            if (x.key === 'color_deep') document.getElementById('cDeep').value = x.value;
            if (x.key === 'color_medium') document.getElementById('cMedium').value = x.value;
            if (x.key === 'color_light') document.getElementById('cLight').value = x.value;
            if (x.key === 'color_white') document.getElementById('cWhite').value = x.value;
        });
    } catch (err) { console.error('Ошибка загрузки цветов:', err); }
}

async function loadTexts() {
    try {
        const settings = await getSiteSettings();
        settings.forEach(x => {
            if (x.key === 'carousel_title') document.getElementById('txtCarousel').value = x.value;
            if (x.key === 'phone1') document.getElementById('txtPhone1').value = x.value;
            if (x.key === 'phone2') document.getElementById('txtPhone2').value = x.value;
            if (x.key === 'contact_email') document.getElementById('txtEmail').value = x.value;
            if (x.key === 'copyright') document.getElementById('txtCopyright').value = x.value;
        });
    } catch (err) { console.error('Ошибка загрузки текстов:', err); }
}

async function loadCartSettings() {
    try {
        const { data, error } = await supabaseClient.from('site_settings').select('value').eq('key', 'max_cart_quantity');
        if (error) { console.error('Ошибка загрузки настройки корзины:', error); return; }
        if (data && data.length > 0) {
            document.getElementById('maxCartQuantity').value = data[0].value;
        }
    } catch (err) { console.error('Ошибка:', err); }
}

window.saveCartSettings = async function() {
    try {
        const maxQty = document.getElementById('maxCartQuantity').value;
        if (maxQty < 1 || maxQty > 999) {
            showToast('Введите число от 1 до 999', true);
            return;
        }
        await updateSiteSetting('max_cart_quantity', maxQty);
        showToast('Настройка корзины сохранена');
    } catch (err) {
        console.error('Ошибка сохранения:', err);
        showToast('Ошибка сохранения', true);
    }
};

window.applyColors = async function() {
    try {
        await updateSiteSetting('color_dark', document.getElementById('cDark').value);
        await updateSiteSetting('color_deep', document.getElementById('cDeep').value);
        await updateSiteSetting('color_medium', document.getElementById('cMedium').value);
        await updateSiteSetting('color_light', document.getElementById('cLight').value);
        await updateSiteSetting('color_white', document.getElementById('cWhite').value);
        showToast('Цвета сохранены');
    } catch (err) { showToast('Ошибка сохранения цветов', true); }
};

window.saveTexts = async function() {
    try {
        await updateSiteSetting('carousel_title', document.getElementById('txtCarousel').value);
        await updateSiteSetting('phone1', document.getElementById('txtPhone1').value);
        await updateSiteSetting('phone2', document.getElementById('txtPhone2').value);
        await updateSiteSetting('contact_email', document.getElementById('txtEmail').value);
        await updateSiteSetting('copyright', document.getElementById('txtCopyright').value);
        showToast('Текст сохранён');
    } catch (err) { showToast('Ошибка сохранения текста', true); }
};

async function loadCarouselAdmin() {
    try {
        carouselData = await getCarousel();
        const div = document.getElementById('carouselEditor');
        if (!carouselData || carouselData.length === 0) { div.innerHTML = '<p style="color:#999;text-align:center;padding:20px;">Нет слайдов</p>'; return; }
        div.innerHTML = carouselData.map(s => `
            <div class="carousel-item">
                <input placeholder="Заголовок" value="${escapeHtml(s.title)}" onchange="updateCarouselField(${s.id}, 'title', this.value)">
                <input placeholder="Текст" value="${escapeHtml(s.text)}" onchange="updateCarouselField(${s.id}, 'text', this.value)">
                <input placeholder="Картинка (URL)" value="${s.img}" onchange="updateCarouselField(${s.id}, 'img', this.value)">
                <button class="btn-delete" onclick="deleteCarouselHandler(${s.id})">Удалить</button>
            </div>
        `).join('');
    } catch (err) { console.error('Ошибка загрузки карусели:', err); }
}

window.updateCarouselField = async function(id, field, val) {
    const success = await updateCarouselItem(id, { [field]: val });
    if (success) showToast('Слайд обновлён');
    else showToast('Ошибка обновления', true);
};

window.deleteCarouselHandler = async function(id) {
    showConfirmModal({
        title: 'Удаление слайда',
        message: 'Вы уверены, что хотите удалить этот слайд?',
        confirmText: 'Удалить',
        cancelText: 'Отмена',
        onConfirm: async () => {
            const success = await deleteCarouselItem(id);
            if (success) { showToast('Слайд удалён'); await loadCarouselAdmin(); }
            else showToast('Ошибка удаления', true);
        }
    });
};

window.addCarousel = async function() {
    const order = (carouselData || []).length + 1;
    const result = await addCarouselItem({ title: 'Новый слайд', text: 'Описание', img: 'https://placehold.co/1200x500/e0e0e0/999?text=Новый+слайд', sort_order: order });
    if (result) { showToast('Слайд добавлен'); await loadCarouselAdmin(); }
    else showToast('Ошибка добавления', true);
};

window.showTab = function(tab) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    const targetTab = document.getElementById(`tab-${tab}`);
    if (targetTab) targetTab.classList.add('active');
    const buttons = document.querySelectorAll('.tab-btn');
    const tabNames = { 'catalog': 'Каталог', 'orders': 'Заказы', 'main': 'Оформление' };
    buttons.forEach(btn => { if (btn.textContent.includes(tabNames[tab] || '')) btn.classList.add('active'); });
    if (tab === 'orders') loadOrdersAdmin();
    if (tab === 'main') { loadColors(); loadTexts(); loadCarouselAdmin(); loadCartSettings(); }
};

document.addEventListener('DOMContentLoaded', function() {
    const addBtn = document.getElementById('addBtn');
    if (addBtn) {
        addBtn.onclick = async function() {
            const newProduct = {
                name: 'Новый товар',
                price: 10000,
                discount: 0,
                category: 'components',
                img: 'https://placehold.co/400x200/e0e0e0/999?text=Новый+товар',
                stock: 0,
                in_stock: true
            };
            const result = await addProduct(newProduct);
            if (result) { showToast('Товар добавлен'); await loadCatalog(); }
            else showToast('Ошибка добавления', true);
        };
    }
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) saveBtn.onclick = saveAll;
});

async function initAdmin() {
    try {
        console.log('Инициализация админ-панели...');
        const saved = localStorage.getItem('technomir_user');
        if (!saved) { window.location.href = 'login.html'; return; }
        const user = JSON.parse(saved);
        if (user.role !== 'admin') { alert('Доступ только для администратора!'); window.location.href = 'index.html'; return; }
        await initSupabase();
        if (!supabaseClient) { showToast('Ошибка подключения к БД', true); return; }
        console.log('Supabase инициализирован');
        await loadCatalog();
        console.log('Админ-панель загружена');
    } catch (err) { console.error('Ошибка:', err); showToast('Ошибка загрузки', true); }
}

document.addEventListener('DOMContentLoaded', initAdmin);