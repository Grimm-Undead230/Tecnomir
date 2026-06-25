const SUPABASE_URL = 'https://dtamewvkovpqpmtmcnhw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0YW1ld3Zrb3ZwcXBtdG1jbmh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMTQxNTIsImV4cCI6MjA5MTU5MDE1Mn0.wruJ5hUvyBYBydE_A_xJ7ioK4-9JgNwbWHm_svUh4as';

let supabaseClient = null;
let currentUser = null;

async function initSupabase() {
    if (!supabaseClient) {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
    const saved = localStorage.getItem('technomir_user');
    if (saved) {
        currentUser = JSON.parse(saved);
        window.currentUser = currentUser;
    }
    return supabaseClient;
}

async function getProducts() {
    const { data, error } = await supabaseClient.from('products').select('*').order('id');
    return error ? [] : data;
}

async function addProduct(product) {
    const newProduct = {
        name: product.name || 'Новый товар',
        price: product.price || 10000,
        discount: product.discount || 0,
        category: product.category || 'components',
        img: product.img || 'https://placehold.co/400x200/e0e0e0/999?text=Новый+товар',
        stock: product.stock || 0,
        in_stock: true
    };
    const { data, error } = await supabaseClient.from('products').insert([newProduct]).select();
    return error ? null : data[0];
}

async function updateProduct(id, updates) {
    const { error } = await supabaseClient.from('products').update(updates).eq('id', id);
    return !error;
}

async function deleteProduct(id) {
    const { error } = await supabaseClient.from('products').delete().eq('id', id);
    return !error;
}

async function updateProductDiscount(id, discount) {
    const { error } = await supabaseClient.from('products').update({ discount: discount }).eq('id', id);
    return !error;
}

async function addToCart(productId, quantity = 1) {
    if (!currentUser) {
        alert('Войдите в аккаунт');
        return false;
    }
    const { data: product, error: productError } = await supabaseClient
        .from('products')
        .select('stock')
        .eq('id', productId)
        .single();
    if (productError || !product) {
        alert('Товар не найден');
        return false;
    }
    const { data: existing, error } = await supabaseClient
        .from('cart')
        .select('quantity')
        .eq('user_id', currentUser.id)
        .eq('product_id', productId);
    if (error) {
        console.error('Ошибка проверки корзины:', error);
        return false;
    }
    let currentQty = 0;
    if (existing && existing.length > 0) {
        currentQty = existing[0].quantity;
    }
    const newQty = currentQty + quantity;
    if (newQty > product.stock) {
        alert(`Недостаточно товара на складе. В наличии: ${product.stock} шт.`);
        return false;
    }
    if (existing && existing.length > 0) {
        const { error: updateError } = await supabaseClient
            .from('cart')
            .update({ quantity: newQty })
            .eq('user_id', currentUser.id)
            .eq('product_id', productId);
        if (updateError) {
            console.error('Ошибка обновления:', updateError);
            return false;
        }
        return true;
    } else {
        const { error: insertError } = await supabaseClient
            .from('cart')
            .insert([{ user_id: currentUser.id, product_id: productId, quantity: quantity }]);
        if (insertError) {
            console.error('Ошибка добавления:', insertError);
            return false;
        }
        return true;
    }
}

async function getCart() {
    if (!currentUser) return [];
    const { data, error } = await supabaseClient
        .from('cart')
        .select('*, products(*)')
        .eq('user_id', currentUser.id);
    return error ? [] : data;
}

async function updateCartItem(id, quantity) {
    const { error } = await supabaseClient
        .from('cart')
        .update({ quantity })
        .eq('id', id);
    return !error;
}

async function removeFromCart(id) {
    const { error } = await supabaseClient
        .from('cart')
        .delete()
        .eq('id', id);
    return !error;
}

async function clearCart() {
    if (!currentUser) return false;
    const { error } = await supabaseClient
        .from('cart')
        .delete()
        .eq('user_id', currentUser.id);
    return !error;
}

async function getSiteSettings() {
    const { data, error } = await supabaseClient.from('site_settings').select('*');
    return error ? [] : data;
}

async function updateSiteSetting(key, value) {
    const { error } = await supabaseClient
        .from('site_settings')
        .update({ value: value })
        .eq('key', key);
    return !error;
}

async function getCarousel() {
    const { data, error } = await supabaseClient.from('carousel').select('*').order('sort_order');
    return error ? [] : data;
}

async function updateCarouselItem(id, updates) {
    const { error } = await supabaseClient.from('carousel').update(updates).eq('id', id);
    return !error;
}

async function addCarouselItem(item) {
    const { data, error } = await supabaseClient.from('carousel').insert([item]).select();
    return error ? null : data[0];
}

async function deleteCarouselItem(id) {
    const { error } = await supabaseClient.from('carousel').delete().eq('id', id);
    return !error;
}