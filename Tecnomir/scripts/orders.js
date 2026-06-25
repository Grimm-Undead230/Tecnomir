
let orders = [];


function showToast(message, isError = false) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #17252A;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 9999;
            display: none;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        `;
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.backgroundColor = isError ? '#ff4757' : '#17252A';
    toast.style.display = 'block';
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.style.display = 'none';
    }, 2000);
}


function showConfirmDialog(message, onConfirm) {
    const oldDialog = document.getElementById('confirmDialog');
    if (oldDialog) oldDialog.remove();

    const dialog = document.createElement('div');
    dialog.id = 'confirmDialog';
    dialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10001;
        animation: fadeIn 0.3s ease;
    `;

    dialog.innerHTML = `
        <div style="
            background: white;
            border-radius: 20px;
            padding: 30px;
            max-width: 350px;
            width: 90%;
            text-align: center;
            animation: scaleIn 0.3s ease;
        ">
            <div style="font-size: 48px; margin-bottom: 15px;">⚠️</div>
            <h3 style="color: #17252A; margin-bottom: 15px;">Подтверждение</h3>
            <p style="color: #666; margin-bottom: 25px;">${message}</p>
            <div style="display: flex; gap: 15px; justify-content: center;">
                <button class="confirm-yes" style="
                    background: #ff4757;
                    color: white;
                    border: none;
                    padding: 10px 25px;
                    border-radius: 40px;
                    cursor: pointer;
                    font-weight: bold;
                ">Да</button>
                <button class="confirm-no" style="
                    background: #17252A;
                    color: white;
                    border: none;
                    padding: 10px 25px;
                    border-radius: 40px;
                    cursor: pointer;
                    font-weight: bold;
                ">Нет</button>
            </div>
        </div>
    `;

    document.body.appendChild(dialog);

    dialog.querySelector('.confirm-yes').onclick = () => {
        dialog.remove();
        if (onConfirm) onConfirm();
    };
    dialog.querySelector('.confirm-no').onclick = () => {
        dialog.remove();
    };
}


async function loadOrders() {
    const container = document.getElementById('ordersContent');
    container.innerHTML = '<div style="text-align:center;padding:40px;">⏳ Загрузка заказов...</div>';

    await initSupabase();

    if (!currentUser) {
        container.innerHTML = `
            <div class="empty-orders">
                <h2>Войдите в аккаунт</h2>
                <p>Чтобы увидеть свои заказы, авторизуйтесь</p>
                <a href="login.html" class="btn-continue">Войти</a>
            </div>
        `;
        return;
    }

    const { data, error } = await supabaseClient
        .from('orders')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Ошибка:', error);
        container.innerHTML = `<div class="empty-orders"><h2>Ошибка загрузки</h2></div>`;
        return;
    }

    orders = data || [];

    if (orders.length === 0) {
        container.innerHTML = `
            <div class="empty-orders">
                <h2>У вас пока нет заказов</h2>
                <p>Перейдите в каталог и сделайте первый заказ</p>
                <a href="catalog.html" class="btn-continue">Перейти в каталог</a>
            </div>
        `;
        return;
    }

    renderOrders();
}


function renderOrders() {
    const container = document.getElementById('ordersContent');

    const ordersHtml = orders.map(order => {
        const items = order.items || [];
        const date = new Date(order.created_at).toLocaleString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        let statusText = '';
        let statusClass = '';
        switch (order.status) {
            case 'новый':
                statusText = 'Новый заказ';
                statusClass = 'status-new';
                break;
            case 'processing':
                statusText = 'В обработке';
                statusClass = 'status-processing';
                break;
            case 'completed':
                statusText = 'Доставлен';
                statusClass = 'status-completed';
                break;
            case 'cancelled':
                statusText = 'Отменён';
                statusClass = 'status-cancelled';
                break;
            default:
                statusText = order.status;
                statusClass = 'status-new';
        }

        const productsGrid = items.map(item => {
            let imgUrl = item.img;
            if (!imgUrl || imgUrl === '' || imgUrl === 'undefined') {
                imgUrl = 'https://placehold.co/280x160/e0e0e0/999?text=' + encodeURIComponent(item.name);
            }

            return `
                <div class="order-product-card">
                    <img src="${imgUrl}" 
                         class="order-product-img" 
                         onerror="this.src='https://placehold.co/280x160/e0e0e0/999?text=Нет+фото'"
                         alt="${escapeHtml(item.name)}">
                    <div class="order-product-info">
                        <div class="order-product-name">${escapeHtml(item.name)}</div>
                        <div class="order-product-price">${item.price.toLocaleString()} KGS</div>
                        <div class="order-product-quantity">Количество: × ${item.quantity}</div>
                        <div class="order-product-total"> ${(item.price * item.quantity).toLocaleString()} KGS</div>
                    </div>
                </div>
            `;
        }).join('');

        const cancelButton = order.status === 'новый' ?
            `<button class="btn-cancel" data-id="${order.id}">❌ Отменить заказ</button>` : '';

        return `
            <div class="order-card" data-order-id="${order.id}">
                <div class="order-header">
                    <div>
                        <span class="order-number">Заказ №${order.order_number}</span>
                        <div class="order-date">📅${date}</div>
                    </div>
                    <div>
                        <span class="order-status ${statusClass}">${statusText}</span>
                    </div>
                </div>
                <div class="order-products-grid">
                    ${productsGrid}
                </div>
                <div class="order-total">
                    Итого: <span>${order.total_amount.toLocaleString()} KGS</span>
                </div>
                <div class="order-actions">
                    ${cancelButton}
                    <button class="btn-repeat" data-id="${order.id}">🔄 Повторить заказ</button>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = ordersHtml;

    document.querySelectorAll('.btn-cancel').forEach(btn => {
        btn.onclick = () => cancelOrder(parseInt(btn.dataset.id));
    });

    document.querySelectorAll('.btn-repeat').forEach(btn => {
        btn.onclick = () => repeatOrder(parseInt(btn.dataset.id));
    });
}


async function cancelOrder(orderId) {
    showConfirmDialog('Отменить этот заказ?', async () => {
        const { error } = await supabaseClient
            .from('orders')
            .update({ status: 'cancelled' })
            .eq('id', orderId);

        if (error) {
            showToast('Ошибка отмены', true);
            return;
        }

        const order = orders.find(o => o.id === orderId);
        if (order && order.items) {
            for (const item of order.items) {
                const { data: product, error: productError } = await supabaseClient
                    .from('products')
                    .select('stock')
                    .eq('id', item.product_id)
                    .single();

                if (!productError && product) {
                    const newStock = product.stock + item.quantity;
                    await supabaseClient
                        .from('products')
                        .update({ stock: newStock })
                        .eq('id', item.product_id);
                }
            }
        }

        showToast('Заказ отменён, товары возвращены на склад');
        await loadOrders();
    });
}


async function repeatOrder(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const items = order.items || [];

    for (const item of items) {
        await addToCart(item.product_id, item.quantity);
    }

    showToast(`${items.length} товаров добавлено в корзину`);

    showConfirmDialog('Перейти в корзину?', () => {
        window.location.href = 'magazzz.html';
    });
}


async function clearCancelledOrders() {
    if (!currentUser) {
        showToast('Сначала войдите в аккаунт', true);
        return;
    }

    showConfirmDialog('Удалить все отменённые заказы?', async () => {
        const { error } = await supabaseClient
            .from('orders')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('status', 'cancelled');

        if (error) {
            showToast('Ошибка очистки', true);
            return;
        }

        showToast('Отменённые заказы удалены');
        await loadOrders();
    });
}


async function loadSettings() {
    try {
        await initSupabase();
        if (!supabaseClient) return;

        const { data: settings } = await supabaseClient.from('site_settings').select('*');
        if (settings) {
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
            console.log('Настройки сайта загружены на странице заказов');
        }
    } catch (err) {
        console.error('Ошибка:', err);
    }
}


function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}


const styleAnimations = document.createElement('style');
styleAnimations.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    @keyframes scaleIn {
        from { transform: scale(0.9); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
    }
`;
document.head.appendChild(styleAnimations);


document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    loadOrders();
});


document.getElementById('clearCancelledBtn').onclick = clearCancelledOrders;
window.cancelOrder = cancelOrder;
window.repeatOrder = repeatOrder;