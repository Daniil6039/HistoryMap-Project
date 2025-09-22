// Инициализация
let map;
let currentTileLayer;
let blankTileLayer;
let drawnItems = new L.FeatureGroup();
let currentDrawing;
let deleteMode = false;
let isDrawing = false;
let polygonPoints = [];

// Годы
const years = [1918, 1941, 1945, 1992, 2020];
let currentYearIndex = 0;
let customBorders = [];
let countryLabels = [];

// Инициализация приложения
async function init() {
    // Карта
    map = L.map('map', {
        zoomControl: false,
        attributionControl: false
    }).setView([54.5260, 15.2551], 6);
    
    // Слои карты
    currentTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 6,
        minZoom: 5
    }).addTo(map);
    
    blankTileLayer = L.tileLayer('', {
        maxZoom: 6,
        minZoom: 5
    });
    
    // Границы просмотра
    map.setMaxBounds([[35, -25], [75, 50]]);
    
    // Слой для рисования
    map.addLayer(drawnItems);
    
    // Обработчики событий для рисования
    setupDrawingEvents();
    
    // Элементы управления
    setupControls();
    
    // Мобильное меню
    setupMobileMenu();
    
    // Данные при запуске
    await loadBordersData();
    
    updateMap();
}

// Функция для автоматической загрузки данных
async function loadBordersData() {
    try {
        const savedData = localStorage.getItem('historicalBordersData');
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            if (Array.isArray(parsedData)) {
                customBorders = parsedData;
                console.log(`Загружено ${customBorders.length} границ из локального хранилища`);
                return;
            }
        }
        
        await loadExampleBorders();
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        customBorders = [];
    }
}

// Функция для сохранения данных в локальное хранилище
function saveBordersData() {
    try {
        localStorage.setItem('historicalBordersData', JSON.stringify(customBorders));
        console.log('Данные сохранены в локальное хранилище');
    } catch (error) {
        console.error('Ошибка сохранения данных:', error);
    }
}

async function loadExampleBorders() {
    try {
        const response = await fetch('example_borders.json');
        if (response.ok) {
            const exampleData = await response.json();
            if (Array.isArray(exampleData)) {
                customBorders = exampleData;
                console.log(`Загружено ${customBorders.length} примеров границ`);
                saveBordersData();
            }
        } else {
            console.log('Файл example_borders.json не найден, создаем пустой массив');
            customBorders = [];
        }
    } catch (error) {
        console.log('Ошибка загрузки example_borders.json, создаем пустой массив:', error);
        customBorders = [];
    }
}

function setupMobileMenu() {
    const menuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);

    function toggleMenu() {
        menuBtn.classList.toggle('active');
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }

    menuBtn.addEventListener('click', toggleMenu);
    overlay.addEventListener('click', toggleMenu);

    // Закрытие меню при клике на ссылки
    sidebar.addEventListener('click', (e) => {
        if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') {
            if (window.innerWidth <= 768) {
                setTimeout(toggleMenu, 300);
            }
        }
    });
}

function setupDrawingEvents() {
    // Обработчик клика левой кнопкой мыши для добавления точек
    map.on('click', function(e) {
        if (!isDrawing) return;
        
        polygonPoints.push(e.latlng);
        
        if (polygonPoints.length === 1) {
            currentDrawing = L.polygon([], {
                color: '#ff7800',
                fillOpacity: 0.2,
                weight: 2,
                className: 'drawing-polygon'
            }).addTo(map);
            
            // Добавление маркера для первой точки
            L.marker(e.latlng, {
                icon: L.divIcon({
                    className: 'drawing-point',
                    html: '<div class="point-marker"></div>',
                    iconSize: [12, 12]
                })
            }).addTo(map);
            
            // Активация кнопки завершения рисования
            document.getElementById('finishBtn').disabled = false;
        } else {
            // Обновляем полигон
            currentDrawing.setLatLngs([polygonPoints]);
            
            // Маркер для точки (добавление)
            L.marker(e.latlng, {
                icon: L.divIcon({
                    className: 'drawing-point',
                    html: '<div class="point-marker"></div>',
                    iconSize: [12, 12]
                })
            }).addTo(map);
        }
    });
    
    // Обработчик правой кнопки мыши для удаления последней точки
    map.on('contextmenu', function(e) {
        if (!isDrawing || polygonPoints.length === 0) return;
        
        e.originalEvent.preventDefault();
        
        // Удаляем последнюю точку
        polygonPoints.pop();
        
        // Обновление полигона
        if (polygonPoints.length > 0) {
            currentDrawing.setLatLngs([polygonPoints]);
        } else {
            map.removeLayer(currentDrawing);
            currentDrawing = null;
            document.getElementById('finishBtn').disabled = true;
        }
        
        // Удаление последнего маркера
        const markers = map._layers;
        let markersArray = [];
        
        for (let id in markers) {
            if (markers[id] instanceof L.Marker && markers[id]._icon && 
                markers[id]._icon.classList.contains('drawing-point')) {
                markersArray.push(markers[id]);
            }
        }
        
        if (markersArray.length > 0) {
            map.removeLayer(markersArray[markersArray.length - 1]);
        }
    });
}

function setupControls() {
    // Ползунок времени
    document.getElementById('timeSlider').addEventListener('input', function(e) {
        currentYearIndex = parseInt(e.target.value);
        document.getElementById('currentYear').textContent = years[currentYearIndex];
        updateMap();
    });
    
    // Тип карты
    document.getElementById('mapType').addEventListener('change', function(e) {
        if (e.target.value === 'blank') {
            map.removeLayer(currentTileLayer);
            blankTileLayer.addTo(map);
        } else {
            map.removeLayer(blankTileLayer);
            currentTileLayer.addTo(map);
        }
    });
    
    // Кнопка "Начать рисование"
    document.getElementById('drawBtn').addEventListener('click', function() {
        startDrawing();
    });
    
    // Кнопка "Завершить рисование"
    document.getElementById('finishBtn').addEventListener('click', function() {
        finishDrawing();
    });
    
    // Кнопка "Отменить"
    document.getElementById('cancelBtn').addEventListener('click', cancelDrawing);
    
    // Кнопка "Сохранить страну"
    document.getElementById('saveBtn').addEventListener('click', saveBorder);
    
    // Кнопка "Удалить страну"
    document.getElementById('deleteBtn').addEventListener('click', toggleDeleteMode);
    
    // Кнопка "Экспорт данных"
    document.getElementById('exportBtn').addEventListener('click', exportData);
    
    // Кнопка "Импорт данных"
    document.getElementById('importBtn').addEventListener('click', () => {
        document.getElementById('importFile').click();
    });
    
    // Обработчик импорта файла
    document.getElementById('importFile').addEventListener('change', importData);
}

function startDrawing() {
    // Сбрасывание предыдущего рисования
    if (currentDrawing) {
        map.removeLayer(currentDrawing);
        currentDrawing = null;
    }
    
    // Очищение всех маркеров точек
    clearDrawingMarkers();
    
    // Новое рисование
    isDrawing = true;
    polygonPoints = [];
    
    // Блокировка/Разблокировка кнопок
    document.getElementById('drawBtn').disabled = true;
    document.getElementById('finishBtn').disabled = true;
    document.getElementById('cancelBtn').disabled = false;
    document.getElementById('countryInfo').classList.add('hidden');
    
    // Инструкция показать
    alert('Инструкция по рисованию:\n• ЛКМ - добавить точку границы\n• ПКМ - удалить последнюю точку\n• Нарисуйте минимум 3 точки для создания страны');
}

function finishDrawing() {
    if (!isDrawing || polygonPoints.length < 3) {
        alert('Добавьте как минимум 3 точки для создания страны');
        return;
    }
    
    // Завершить рисовать 
    isDrawing = false;
    
    // Показать форму для ввода информации о стране
    document.getElementById('countryInfo').classList.remove('hidden');
    document.getElementById('saveBtn').disabled = false;
}

function saveBorder() {
    if (!currentDrawing || polygonPoints.length < 3) return;
    
    const name = document.getElementById('countryName').value || 'Без названия';
    const details = document.getElementById('countryDetails').value;
    const color = document.getElementById('countryColor').value;
    const currentYear = years[currentYearIndex];
    const coords = polygonPoints.map(ll => [ll.lat, ll.lng]);
    
    customBorders.push({
        name: name,
        coords: coords,
        year: currentYear,
        details: details,
        color: color
    });
    
    // Сохраняем данные
    saveBordersData();
    
    // Очищаем временные маркеры
    clearDrawingMarkers();
    
    updateMap();
    cancelDrawing();
}

function cancelDrawing() {
    // Очищаем временные элементы рисования
    if (currentDrawing) {
        map.removeLayer(currentDrawing);
        currentDrawing = null;
    }
    
    // Очищаем маркеры точек
    clearDrawingMarkers();
    
    isDrawing = false;
    polygonPoints = [];
    
    // Сбрасываем UI
    document.getElementById('countryInfo').classList.add('hidden');
    document.getElementById('drawBtn').disabled = false;
    document.getElementById('finishBtn').disabled = true;
    document.getElementById('cancelBtn').disabled = true;
    document.getElementById('saveBtn').disabled = true;
    
    document.getElementById('countryName').value = '';
    document.getElementById('countryDetails').value = '';
    document.getElementById('countryColor').value = '#3388ff';
}

function clearDrawingMarkers() {
    const markers = map._layers;
    for (let id in markers) {
        if (markers[id] instanceof L.Marker && markers[id]._icon && 
            markers[id]._icon.classList.contains('drawing-point')) {
            map.removeLayer(markers[id]);
        }
    }
}

function createCountryLabel(border) {
    // Вычисляем центр полигона
    const center = getPolygonCenter(border.coords);
    
    // Создаем красивую текстовую метку
    const label = L.divIcon({
        className: 'country-label',
        html: `<div class="country-name">${border.name}</div>`,
        iconSize: [border.name.length * 8 + 20, 30],
        iconAnchor: [border.name.length * 4 + 10, 15]
    });
    
    return L.marker(center, {icon: label, interactive: false});
}

function getPolygonCenter(coords) {
    // Используем алгоритм центра масс для многоугольника
    let area = 0;
    let latSum = 0;
    let lngSum = 0;
    const n = coords.length;
    
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const xi = coords[i][1];
        const yi = coords[i][0];
        const xj = coords[j][1];
        const yj = coords[j][0];
        
        const cross = (xi * yj - xj * yi);
        area += cross;
        latSum += (xi + xj) * cross;
        lngSum += (yi + yj) * cross;
    }
    
    area *= 3;
    if (area === 0) {
        const avgLat = coords.reduce((sum, coord) => sum + coord[0], 0) / n;
        const avgLng = coords.reduce((sum, coord) => sum + coord[1], 0) / n;
        return [avgLat, avgLng];
    }
    
    return [lngSum / area, latSum / area];
}

function clearMap() {
    // Удаляем все слои, кроме базовых тайлов и временных маркеров рисования
    map.eachLayer(layer => {
        if (layer !== currentTileLayer && 
            layer !== blankTileLayer && 
            !(layer instanceof L.Marker && layer._icon && layer._icon.classList.contains('drawing-point'))) {
            map.removeLayer(layer);
        }
    });
    
    // Очищаем массив меток
    countryLabels = [];
}

function updateMap() {
    // Очищаем старые границы и метки
    clearMap();
    
    // Добавляем границы для текущего года
    const currentYear = years[currentYearIndex];
    const currentBorders = customBorders.filter(border => border.year === currentYear);
    
    // Сначала создаем все полигоны
    currentBorders.forEach((border, index) => {
        // Создаем полигон страны
        const polygon = L.polygon(border.coords, {
            color: border.color || '#3388ff',
            fillOpacity: 0.4,
            weight: 2,
            className: 'country-polygon'
        }).addTo(map);
        
        // Добавляем всплывающее окно с информацией
        const formattedDetails = border.details ? border.details.replace(/\n/g, '<br>') : '';
        polygon.bindPopup(`
            <div style="text-align: center; padding: 10px;">
                <h3 style="margin: 0 0 10px 0; color: ${border.color || '#3388ff'}">${border.name}</h3>
                <p style="margin: 0; color: #555;">${formattedDetails || 'Нет дополнительной информации'}</p>
                <hr style="margin: 10px 0;">
                <small style="color: #888;">Год: ${border.year}</small>
            </div>
        `);
        
        // Обработчик для режима удаления
        if (deleteMode) {
            polygon.on('click', function() {
                if (confirm(`Удалить "${border.name}"?`)) {
                    customBorders.splice(customBorders.indexOf(border), 1);
                    saveBordersData();
                    updateMap();
                }
            });
            polygon.setStyle({color: 'red', fillOpacity: 0.3});
        }
    });
    
    // Затем создаем метки с проверкой на пересечение
    const labelPositions = [];
    
    currentBorders.forEach(border => {
        let center = getPolygonCenter(border.coords);
        let finalPosition = findBestLabelPosition(center, border.coords, labelPositions);
        
        // Создаем текстовую метку с названием страны
        const label = createCountryLabel(border);
        label.setLatLng(finalPosition);
        label.addTo(map);
        
        // Сохраняем позицию метки для проверки пересечений
        labelPositions.push({
            latlng: finalPosition,
            bounds: getLabelBounds(finalPosition, border.name.length)
        });
        
        // Сохраняем ссылку на метку
        countryLabels.push(label);
    });
}

function getLabelBounds(position, nameLength) {
    // Вычисляем приблизительные границы метки
    const labelWidth = nameLength * 8 + 20;
    const labelHeight = 30;
    
    // Преобразуем координаты в пиксели
    const point = map.latLngToContainerPoint(position);
    
    return {
        minX: point.x - labelWidth / 2,
        maxX: point.x + labelWidth / 2,
        minY: point.y - labelHeight / 2,
        maxY: point.y + labelHeight / 2
    };
}

function checkLabelCollision(newBounds, existingBounds) {
    // Проверяем пересечение двух прямоугольников
    return !(newBounds.maxX < existingBounds.minX || 
             newBounds.minX > existingBounds.maxX || 
             newBounds.maxY < existingBounds.minY || 
             newBounds.minY > existingBounds.maxY);
}

function findBestLabelPosition(center, coords, existingPositions) {
    const positionsToTry = [
        center, // Исходная позиция
        [center[0] + 0.5, center[1]], // Смещение вниз
        [center[0] - 0.5, center[1]], // Смещение вверх
        [center[0], center[1] + 1],   // Смещение вправо
        [center[0], center[1] - 1],   // Смещение влево
        [center[0] + 0.5, center[1] + 1], // Смещение вниз-вправо
        [center[0] - 0.5, center[1] + 1], // Смещение вверх-вправо
        [center[0] + 0.5, center[1] - 1], // Смещение вниз-влево
        [center[0] - 0.5, center[1] - 1]  // Смещение вверх-влево
    ];
    
    // Проверяем, находится ли точка внутри полигона
    function isPointInPolygon(point, polygon) {
        const x = point[0], y = point[1];
        let inside = false;
        
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i][0], yi = polygon[i][1];
            const xj = polygon[j][0], yj = polygon[j][1];
            
            const intersect = ((yi > y) !== (yj > y)) &&
                (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        
        return inside;
    }
    
    // Ищем лучшую позицию
    for (let position of positionsToTry) {
        const bounds = getLabelBounds(position, coords.name ? coords.name.length : 10);
        let collision = false;
        
        // Проверяем пересечение с существующими метками
        for (let existing of existingPositions) {
            if (checkLabelCollision(bounds, existing.bounds)) {
                collision = true;
                break;
            }
        }
        
        // Проверяем, находится ли позиция внутри полигона
        const isInside = isPointInPolygon(position, coords);
        
        if (!collision && isInside) {
            return position;
        }
    }
    
    // Если все позиции пересекаются, возвращаем исходную
    return center;
}

function toggleDeleteMode() {
    deleteMode = !deleteMode;
    const btn = document.getElementById('deleteBtn');
    
    if (deleteMode) {
        btn.classList.remove('btn-danger');
        btn.classList.add('btn-danger-active');
        btn.textContent = 'Режим удаления (кликните на страну)';
    } else {
        btn.classList.remove('btn-danger-active');
        btn.classList.add('btn-danger');
        btn.textContent = 'Удалить страну';
    }
    
    updateMap();
}

function exportData() {
    if (customBorders.length === 0) {
        alert('Нет данных для экспорта');
        return;
    }
    
    const data = JSON.stringify(customBorders, null, 2);
    const blob = new Blob([data], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `исторические_границы_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
}

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (Array.isArray(importedData)) {
                customBorders = importedData;
                saveBordersData();
                updateMap();
                alert(`Успешно импортировано ${customBorders.length} границ`);
            } else {
                throw new Error('Неверный формат данных');
            }
        } catch (error) {
            alert('Ошибка импорта: ' + error.message);
        }
    };
    reader.onerror = function() {
        alert('Ошибка чтения файла');
    };
    reader.readAsText(file);
    e.target.value = '';
}

// Запускаем приложение
document.addEventListener('DOMContentLoaded', init);