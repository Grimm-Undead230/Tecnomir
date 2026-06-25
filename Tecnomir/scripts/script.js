document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.querySelector('.search-input');
    const clearBtn = document.querySelector('.clear-btn');
    const searchBtn = document.querySelector('.search-btn');
    
    if (searchInput && clearBtn) {
        searchInput.addEventListener('input', function() {
            if (this.value.length > 0) {
                clearBtn.classList.add('visible');
            } else {
                clearBtn.classList.remove('visible');
            }
        });
        
        clearBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            searchInput.value = '';
            clearBtn.classList.remove('visible');
            searchInput.focus();
        });
        
        searchBtn.addEventListener('click', function() {
            performSearch();
        });
        
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
        
        function performSearch() {
            const query = searchInput.value.trim();
            if (query) {
                console.log(' Поисковый запрос:', query);
                
                searchBtn.style.transform = 'scale(0.9)';
                setTimeout(() => {
                    searchBtn.style.transform = '';
                }, 200);
                
                alert(`Поиск: "${query}"`);
            } else {
                searchInput.style.borderColor = '#ff6b6b';
                setTimeout(() => {
                    searchInput.style.borderColor = '';
                }, 500);
            }
        }
        
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && this.value.length > 0) {
                this.value = '';
                clearBtn.classList.remove('visible');
            }
        });
    }
});
document.addEventListener('DOMContentLoaded', function() {
    const track = document.querySelector('.carousel-track');
    const slides = document.querySelectorAll('.carousel-slide');
    const prevBtn = document.querySelector('.carousel-arrow.prev');
    const nextBtn = document.querySelector('.carousel-arrow.next');
    const dots = document.querySelectorAll('.carousel-dots .dot');
    
    if (!track || !slides.length) {
        console.log('Карусель не найдена на этой странице');
        return; 
    
    console.log('Карусель найдена, слайдов:', slides.length);
    
    let currentIndex = 0;
    const totalSlides = slides.length;
    
    function goToSlide(index) {
        if (index < 0) index = totalSlides - 1;
        if (index >= totalSlides) index = 0;
        
        track.style.transform = `translateX(-${index * 100}%)`;
        
        currentIndex = index;
        
        if (dots.length) {
            dots.forEach((dot, i) => {
                if (i === index) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
        }
        
        console.log('Текущий слайд:', index + 1);
    }
    
    if (prevBtn) {
        prevBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Клик: предыдущий слайд');
            goToSlide(currentIndex - 1);
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Клик: следующий слайд');
            goToSlide(currentIndex + 1);
        });
    }
    
    if (dots.length) {
        dots.forEach((dot, index) => {
            dot.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('Клик на точку:', index + 1);
                goToSlide(index);
            });
        });
    }
    
    let autoPlayInterval = setInterval(function() {
        goToSlide(currentIndex + 1);
    }, 5000); 
    
    const carouselWrapper = document.querySelector('.carousel-wrapper');
    if (carouselWrapper) {
        carouselWrapper.addEventListener('mouseenter', function() {
            clearInterval(autoPlayInterval);
        });
        
        carouselWrapper.addEventListener('mouseleave', function() {
            autoPlayInterval = setInterval(function() {
                goToSlide(currentIndex + 1);
            }, 5000);
        });
    }
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            goToSlide(currentIndex - 1);
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            goToSlide(currentIndex + 1);
        }
    });
    
    goToSlide(0);
    
    window.addEventListener('resize', function() {
        track.style.transform = `translateX(-${currentIndex * 100}%)`;
    });
document.querySelectorAll('.carousel-slide').forEach((slide, index) => {
    slide.addEventListener('click', function() {
        const categories = ['periphery', 'periphery', 'components', 'components', 'periphery', 'cctv'];
        window.location.href = `catalog.html?category=${categories[index]}`;
    });
    slide.style.cursor = 'pointer';
});
});

