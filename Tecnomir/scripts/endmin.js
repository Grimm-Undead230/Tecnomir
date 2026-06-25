
let carouselData = [];


function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    toast.innerText = message;
    toast.className = 'toast ' + (isError ? 'error' : 'success');
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}


async function loadSettings() {
    try {
        const { data, error } = await supabaseClient
            .from('site_settings')
            .select('*');
        
        if (error) {
            console.error('Ошибка загрузки настроек:', error);
            return;
        }
        
        if (data) {
            data.forEach(s => {
                const el = document.getElementById(s.key);
                if (el) el.value = s.value;
            });
        }
    } catch (err) {
        console.error('Ошибка:', err);
    }
}


async function loadCarousel() {
    try {
        const { data, error } = await supabaseClient
            .from('carousel')
            .select('*')
            .order('sort_order');
        
        if (error) {
            console.error('Ошибка загрузки карусели:', error);
            return;
        }
        
        carouselData = data || [];
        renderCarousel();
    } catch (err) {
        console.error('Ошибка:', err);
    }
}


function renderCarousel() {
    const container = document.getElementById('carouselList');
    container.innerHTML = '';
    
    if (!carouselData || carouselData.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:30px;color:#999;">
                <p style="font-size:2rem;margin-bottom:10px;">🖼️</p>
                <p>Нет слайдов. Добавьте первый!</p>
            </div>
        `;
        return;
    }
    
    carouselData.forEach((slide, i) => {
        container.innerHTML += `
            <div class="slide-item" data-id="${slide.id}">
                <div class="slide-header">
                    <span class="slide-number">📸 Слайд ${i + 1} из ${carouselData.length}</span>
                    <button onclick="deleteSlide(${slide.id})" class="btn-delete-slide">🗑️ Удалить</button>
                </div>
                <input type="text" id="carousel_title_${i}" value="${escapeHtml(slide.title)}" placeholder="Заголовок слайда">
                <input type="text" id="carousel_text_${i}" value="${escapeHtml(slide.text)}" placeholder="Текст слайда">
                <input type="text" id="carousel_img_${i}" value="${slide.img}" placeholder="Путь к картинке (например, img/photo.jpg)">
                <div class="slide-preview">
                    <img src="${slide.img || 'https://placehold.co/60x60/e0e0e0/999?text=Нет+фото'}" 
                         alt="Превью" 
                         onerror="this.src='https://placehold.co/60x60/e0e0e0/999?text=Ошибка'">
                    <div class="preview-text">
                        <strong>${escapeHtml(slide.title) || 'Без названия'}</strong>
                        <br>
                        <span style="font-size:0.8rem;color:#999;">${escapeHtml(slide.text) || 'Нет описания'}</span>
                    </div>
                </div>
            </div>
        `;
    });
}


async function addSlide() {
    try {
        const newOrder = carouselData.length + 1;
        const { data, error } = await supabaseClient
            .from('carousel')
            .insert([{
                title: 'Новый слайд',
                text: 'Описание слайда',
                img: 'https://placehold.co/600x400/e0e0e0/999?text=Новый+слайд',
                sort_order: newOrder
            }])
            .select();
        
        if (error) {
            showToast('❌ Ошибка добавления слайда: ' + error.message, true);
            return;
        }
        
        showToast('✅ Слайд добавлен!');
        await loadCarousel();
    } catch (err) {
        console.error('Ошибка:', err);
        showToast('❌ Ошибка при добавлении слайда', true);
    }
}


async function deleteSlide(id) {
    if (!confirm('Удалить этот слайд?')) return;
    
    try {
        const { error } = await supabaseClient
            .from('carousel')
            .delete()
            .eq('id', id);
        
        if (error) {
            showToast('❌ Ошибка удаления: ' + error.message, true);
            return;
        }
        
        showToast('🗑️ Слайд удалён');
        await loadCarousel();
    } catch (err) {
        console.error('Ошибка:', err);
        showToast('❌ Ошибка при удалении слайда', true);
    }
}


async function saveColors() {
    try {
        const colors = ['color_dark', 'color_deep', 'color_medium', 'color_light', 'color_white'];
        
        for (let key of colors) {
            const value = document.getElementById(key).value;
            console.log(`Сохраняем ${key} = ${value}`);
            
            const { error } = await supabaseClient
                .from('site_settings')
                .update({ value: value })
                .eq('key', key);
            
            if (error) {
                console.error('Ошибка сохранения цвета:', error);
                showToast('❌ Ошибка сохранения цветов', true);
                return;
            }
        }
        
        
        applyColorsToPage();
        
        showToast('🎨 Цвета сохранены!');
    } catch (err) {
        console.error('Ошибка:', err);
        showToast('❌ Ошибка сохранения цветов', true);
    }
}


function applyColorsToPage() {
    const colors = {
        'color_dark': document.getElementById('color_dark').value,
        'color_deep': document.getElementById('color_deep').value,
        'color_medium': document.getElementById('color_medium').value,
        'color_light': document.getElementById('color_light').value,
        'color_white': document.getElementById('color_white').value
    };
    
  
    document.documentElement.style.setProperty('--dark-blue', colors.color_dark);
    document.documentElement.style.setProperty('--deep-teal', colors.color_deep);
    document.documentElement.style.setProperty('--medium-teal', colors.color_medium);
    document.documentElement.style.setProperty('--light-teal', colors.color_light);
    document.documentElement.style.setProperty('--white', colors.color_white);
    
    console.log('✅ Цвета применены на странице:', colors);
}


async function saveTexts() {
    try {
        const texts = ['carousel_title', 'brands_title', 'phone1', 'phone2', 'copyright'];
        
        for (let key of texts) {
            const value = document.getElementById(key).value;
            console.log(`Сохраняем ${key} = ${value}`);
            
            const { error } = await supabaseClient
                .from('site_settings')
                .update({ value: value })
                .eq('key', key);
            
            if (error) {
                console.error('Ошибка сохранения текста:', error);
                showToast('❌ Ошибка сохранения текста', true);
                return;
            }
        }
        
        showToast('📝 Текст сохранён!');
    } catch (err) {
        console.error('Ошибка:', err);
        showToast('❌ Ошибка сохранения текста', true);
    }
}


async function saveCarousel() {
    try {
        const { data: existing, error: fetchError } = await supabaseClient
            .from('carousel')
            .select('id')
            .order('sort_order');
        
        if (fetchError) {
            showToast('❌ Ошибка загрузки данных: ' + fetchError.message, true);
            return;
        }
        
        for (let i = 0; i < existing.length; i++) {
            const title = document.getElementById(`carousel_title_${i}`).value;
            const text = document.getElementById(`carousel_text_${i}`).value;
            const img = document.getElementById(`carousel_img_${i}`).value;
            
            const { error } = await supabaseClient
                .from('carousel')
                .update({ 
                    title: title, 
                    text: text, 
                    img: img,
                    sort_order: i + 1
                })
                .eq('id', existing[i].id);
            
            if (error) {
                console.error('Ошибка сохранения слайда:', error);
                showToast('❌ Ошибка сохранения карусели', true);
                return;
            }
        }
        
        showToast('🖼️ Карусель сохранена!');
        await loadCarousel();
    } catch (err) {
        console.error('Ошибка:', err);
        showToast('❌ Ошибка сохранения карусели', true);
    }
}


function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));
}


async function init() {
    try {
      
        const saved = localStorage.getItem('technomir_user');
        if (!saved) {
            window.location.href = 'login.html';
            return;
        }
        
        const user = JSON.parse(saved);
        if (user.role !== 'admin') {
            alert('⛔ Доступ только для администратора!');
            window.location.href = 'index.html';
            return;
        }
        
        
        await initSupabase();
        
       
        if (typeof supabaseClient === 'undefined' || !supabaseClient) {
            console.error('supabaseClient не инициализирован');
            showToast('Ошибка подключения к базе данных', true);
            return;
        }
        
        console.log('supabaseClient инициализирован');
        
     
        await loadSettings();
        await loadCarousel();
        
       
        applyColorsFromDB();
        
        console.log('Редактор загружен');
    } catch (err) {
        console.error('Ошибка инициализации:', err);
        showToast('Ошибка загрузки редактора', true);
    }
}


async function applyColorsFromDB() {
    try {
        const { data, error } = await supabaseClient
            .from('site_settings')
            .select('*')
            .in('key', ['color_dark', 'color_deep', 'color_medium', 'color_light', 'color_white']);
        
        if (error || !data) return;
        
        data.forEach(s => {
            const el = document.getElementById(s.key);
            if (el) el.value = s.value;
        });
        
    
        applyColorsToPage();
    } catch (err) {
        console.error('Ошибка загрузки цветов:', err);
    }
}


window.saveColors = saveColors;
window.saveTexts = saveTexts;
window.saveCarousel = saveCarousel;
window.addSlide = addSlide;
window.deleteSlide = deleteSlide;


document.addEventListener('DOMContentLoaded', init);