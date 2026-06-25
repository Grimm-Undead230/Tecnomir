let cartItems = [];

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

async function loadCart() {
    const container = document.getElementById('cartContent');
    if (!container) return;
    container.innerHTML = '<div style="text-align:center;padding:40px;">Загрузка корзины...</div>';
    try {
        await initSupabase();
        if (!currentUser) {
            container.innerHTML = `
                <div class="empty-cart">
                    <h2>Войдите в аккаунт</h2>
                    <p>Чтобы увидеть корзину, авторизуйтесь</p>
                    <a href="login.html" class="btn-continue">Войти</a>
                </div>
            `;
            return;
        }
        cartItems = await getCart();
        console.log('Товаров в корзине:', cartItems.length);
        if (!cartItems || cartItems.length === 0) {
            container.innerHTML = `
                <div class="empty-cart">
                    <h2>Корзина пуста</h2>
                    <p>Добавьте товары из каталога</p>
                    <a href="catalog.html" class="btn-continue">Перейти в каталог</a>
                </div>
            `;
            return;
        }
        renderCart();
    } catch (error) {
        console.error('Ошибка:', error);
        container.innerHTML = `
            <div class="empty-cart">
                <h2>Ошибка загрузки</h2>
                <p>Не удалось загрузить корзину</p>
                <button onclick="location.reload()" class="btn-continue">Обновить</button>
            </div>
        `;
    }
}

function renderCart() {
    const container = document.getElementById('cartContent');
    let total = 0;
    const itemsHtml = cartItems.map(item => {
        const product = item.products;
        if (!product) return '';
        const discountPrice = product.discount && product.discount > 0 
            ? Math.round(product.price * (100 - product.discount) / 100)
            : product.price;
        const itemTotal = discountPrice * item.quantity;
        total += itemTotal;
        return `
            <tr>
                <td style="width:80px;">
                    <img src="${product.img || 'https://placehold.co/60x60'}" 
                         style="width:60px;height:60px;object-fit:cover;border-radius:8px;" 
                         onerror="this.src='https://placehold.co/60x60'">
                </td>
                <td>
                    <strong>${escapeHtml(product.name)}</strong>
                    ${product.discount ? `<span style="margin-left:10px;background:#ff4757;color:#fff;padding:2px 8px;border-radius:12px;font-size:0.7rem;">-${product.discount}%</span>` : ''}
                </td>
                <td>${discountPrice.toLocaleString()} KGS</td>
                <td>
                    <input type="number" value="${item.quantity}" min="1" 
                           onchange="updateQty(${item.id}, this.value)">
                </td>
                <td><strong>${itemTotal.toLocaleString()} KGS</strong></td>
                <td>
                    <button onclick="removeItem(${item.id})" 
                            style="background:none;border:none;color:#ff4757;cursor:pointer;font-size:1.2rem;">
                        Удалить
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Товар</th>
                    <th>Название</th>
                    <th>Цена</th>
                    <th>Кол-во</th>
                    <th>Сумма</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
        </table>
        <div class="cart-total">
            <h3>Итого: <span>${total.toLocaleString()} KGS</span></h3>
        </div>
        <div class="cart-actions">
            <a href="catalog.html" class="btn-continue">Продолжить покупки</a>
            <div>
                <button onclick="clearAllCart()" class="btn-clear">Очистить</button>
                <button onclick="checkout()" class="btn-checkout">Оформить заказ</button>
            </div>
        </div>
    `;
}

async function updateQty(cartId, quantity) {
    const newQty = parseInt(quantity);
    if (newQty < 1) {
        showToast('Количество не может быть меньше 1', true);
        await loadCart();
        return;
    }
    if (newQty > 99) {
        showToast('Максимум 99 штук на один товар', true);
        await loadCart();
        return;
    }
    const cartItem = cartItems.find(item => item.id === cartId);
    if (!cartItem) {
        showToast('Товар не найден', true);
        return;
    }
    const { data: product, error } = await supabaseClient
        .from('products')
        .select('stock')
        .eq('id', cartItem.product_id)
        .single();
    if (error) {
        console.error('Ошибка проверки склада:', error);
        showToast('Ошибка проверки', true);
        return;
    }
    if (newQty > product.stock) {
        showToast(`Недостаточно товара на складе. В наличии: ${product.stock} шт.`, true);
        await loadCart();
        return;
    }
    const success = await updateCartItem(cartId, newQty);
    if (success) {
        showToast('Количество обновлено');
        await loadCart();
    } else {
        showToast('Ошибка обновления', true);
    }
}

async function removeItem(cartId) {
    const success = await removeFromCart(cartId);
    if (success) {
        showToast('Товар удалён');
        await loadCart();
    } else {
        showToast('Ошибка удаления', true);
    }
}

async function clearAllCart() {
    if (cartItems.length === 0) {
        showToast('Корзина уже пуста', true);
        return;
    }
    const success = await clearCart();
    if (success) {
        showToast('Корзина очищена');
        await loadCart();
    } else {
        showToast('Ошибка очистки', true);
    }
}
async function checkout() {
    if (!cartItems.length) {
        showToast('Корзина пуста', true);
        return;
    }
    
    let total = 0;
    const items = [];
    
    for (const item of cartItems) {
        const product = item.products;
        
        const { data: productData, error: productError } = await supabaseClient
            .from('products')
            .select('stock')
            .eq('id', product.id)
            .single();
        
        if (productError) {
            console.error('Ошибка проверки склада:', productError);
            showToast('Ошибка проверки наличия товара', true);
            return;
        }
        
        if (item.quantity > productData.stock) {
            showToast('Недостаточно товара "' + product.name + '". В наличии: ' + productData.stock + ' шт.', true);
            return;
        }
        
        const discountPrice = product.discount && product.discount > 0 
            ? Math.round(product.price * (100 - product.discount) / 100)
            : product.price;
        total += discountPrice * item.quantity;
        
        items.push({
            product_id: product.id,
            name: product.name,
            price: discountPrice,
            quantity: item.quantity,
            img: product.img || 'https://placehold.co/280x160?text=Нет+фото'
        });
    }
    
    const orderNumber = 'ORD-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    
    const { error: orderError } = await supabaseClient
        .from('orders')
        .insert([{
            user_id: currentUser.id,
            order_number: orderNumber,
            total_amount: total,
            status: 'новый',
            items: items
        }]);
    
    if (orderError) {
        console.error('Ошибка сохранения заказа:', orderError);
        showToast('Ошибка оформления заказа', true);
        return;
    }
    
    for (const item of cartItems) {
        const product = item.products;
        const newStock = product.stock - item.quantity;
        
        const { error: stockError } = await supabaseClient
            .from('products')
            .update({ stock: newStock })
            .eq('id', product.id);
        
        if (stockError) {
            console.error('Ошибка обновления склада:', stockError);
            showToast('Ошибка обновления склада', true);
            return;
        }
    }
    
    await supabaseClient.from('cart').delete().eq('user_id', currentUser.id);
    
    showToast('Заказ оформлен!');
    showOrderSuccessModal(total, orderNumber);
    
    setTimeout(() => {
        loadCart();
    }, 1500);
}

function showOrderSuccessModal(total, orderNumber) {
    const modal = document.createElement('div');
    modal.className = 'order-success-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-icon"></div>
            <h2>Заказ оформлен!</h2>
            <p style="color: #666; margin-bottom: 5px;">Номер заказа:</p>
            <p class="order-number">${orderNumber}</p>
            <p class="total-price">${total.toLocaleString()} KGS</p>
            <p style="color: #666; margin-bottom: 25px;">Спасибо за покупку!</p>
            <div class="modal-actions">
                <button onclick="window.location.href='orders.html'" class="btn-orders">Мои заказы</button>
                <button onclick="closeOrderModal()" class="btn-close">Закрыть</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    setTimeout(() => {
        closeOrderModal();
    }, 8000);
}

function closeOrderModal() {
    const modal = document.querySelector('.order-success-modal');
    if (modal) modal.remove();
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));
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
            console.log('Настройки сайта загружены на странице корзины');
        }
    } catch (err) {
        console.error('Ошибка:', err);
    }
}

window.updateQty = updateQty;
window.removeItem = removeItem;
window.clearAllCart = clearAllCart;
window.checkout = checkout;
window.closeOrderModal = closeOrderModal;

document.addEventListener('DOMContentLoaded', () => {
    loadSiteSettings();
    loadCart();
});