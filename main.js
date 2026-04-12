// Константы карты
const TILE_SIZE = 64;
const MAP_WIDTH = 40;  // Увеличенная карта для генерации
const MAP_HEIGHT = 40; // Увеличенная карта для генерации

// Типы форм комнат
const ROOM_SHAPES = {
    RECTANGLE: 'rectangle',
    SQUARE: 'square',
    L_SHAPE: 'l-shape',
    T_SHAPE: 't-shape',
    CROSS: 'cross'
};

// Сгенерированная карта
let MAP = [];

// Список сгенерированных комнат
let rooms = [];

/**
 * Инициализация пустой карты (все стены)
 */
function initEmptyMap() {
    MAP = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
        MAP[y] = [];
        for (let x = 0; x < MAP_WIDTH; x++) {
            MAP[y][x] = 1; // 1 = стена
        }
    }
}

/**
 * Проверка, можно ли разместить комнату в заданной позиции
 */
function canPlaceRoom(x, y, width, height) {
    // Проверка границ с отступом
    if (x < 1 || y < 1 || x + width + 1 >= MAP_WIDTH || y + height + 1 >= MAP_HEIGHT) {
        return false;
    }
    
    // Проверка пересечения с другими комнатами
    for (let room of rooms) {
        // Проверка пересечения прямоугольников (с отступом 1 клетку)
        // Добавляем отступ в 1 клетку вокруг каждой комнаты
        if (x - 1 < room.x + room.width && x + width + 1 > room.x &&
            y - 1 < room.y + room.height && y + height + 1 > room.y) {
            return false;
        }
    }
    return true;
}

/**
 * Вырезание прямоугольной комнаты
 */
function cutRectangularRoom(x, y, width, height) {
    for (let ry = y; ry < y + height; ry++) {
        for (let rx = x; rx < x + width; rx++) {
            if (rx >= 0 && rx < MAP_WIDTH && ry >= 0 && ry < MAP_HEIGHT) {
                MAP[ry][rx] = 0; // 0 = пустота
            }
        }
    }
}

/**
 * Вырезание L-образной комнаты
 */
function cutLShapedRoom(x, y, width, height) {
    // Основная часть (левая вертикальная)
    const leftWidth = Math.floor(width * 0.6);
    for (let ry = y; ry < y + height; ry++) {
        for (let rx = x; rx < x + leftWidth; rx++) {
            if (rx >= 0 && rx < MAP_WIDTH && ry >= 0 && ry < MAP_HEIGHT) {
                MAP[ry][rx] = 0;
            }
        }
    }
    // Нижняя часть (горизонтальная)
    const bottomHeight = Math.floor(height * 0.4);
    for (let ry = y + height - bottomHeight; ry < y + height; ry++) {
        for (let rx = x; rx < x + width; rx++) {
            if (rx >= 0 && rx < MAP_WIDTH && ry >= 0 && ry < MAP_HEIGHT) {
                MAP[ry][rx] = 0;
            }
        }
    }
}

/**
 * Вырезание T-образной комнаты
 */
function cutTShapedRoom(x, y, width, height) {
    // Верхняя горизонтальная перекладина
    const topHeight = Math.floor(height * 0.3);
    for (let ry = y; ry < y + topHeight; ry++) {
        for (let rx = x; rx < x + width; rx++) {
            if (rx >= 0 && rx < MAP_WIDTH && ry >= 0 && ry < MAP_HEIGHT) {
                MAP[ry][rx] = 0;
            }
        }
    }
    // Центральная вертикальная часть
    const stemWidth = Math.floor(width * 0.4);
    const stemX = x + Math.floor(width * 0.3);
    for (let ry = y + topHeight; ry < y + height; ry++) {
        for (let rx = stemX; rx < stemX + stemWidth; rx++) {
            if (rx >= 0 && rx < MAP_WIDTH && ry >= 0 && ry < MAP_HEIGHT) {
                MAP[ry][rx] = 0;
            }
        }
    }
}

/**
 * Вырезание крестообразной комнаты
 */
function cutCrossShapedRoom(x, y, width, height) {
    const centerX = x + Math.floor(width / 2);
    const centerY = y + Math.floor(height / 2);
    const armWidth = Math.floor(width * 0.4);
    const armHeight = Math.floor(height * 0.4);
    
    // Горизонтальная перекладина
    for (let ry = centerY - Math.floor(armHeight / 2); ry < centerY + Math.ceil(armHeight / 2); ry++) {
        for (let rx = x; rx < x + width; rx++) {
            if (rx >= 0 && rx < MAP_WIDTH && ry >= 0 && ry < MAP_HEIGHT) {
                MAP[ry][rx] = 0;
            }
        }
    }
    // Вертикальная перекладина
    for (let ry = y; ry < y + height; ry++) {
        for (let rx = centerX - Math.floor(armWidth / 2); rx < centerX + Math.ceil(armWidth / 2); rx++) {
            if (rx >= 0 && rx < MAP_WIDTH && ry >= 0 && ry < MAP_HEIGHT) {
                MAP[ry][rx] = 0;
            }
        }
    }
}

/**
 * Вырезание комнаты заданной формы
 */
function cutRoom(room) {
    switch (room.shape) {
        case ROOM_SHAPES.RECTANGLE:
        case ROOM_SHAPES.SQUARE:
            cutRectangularRoom(room.x, room.y, room.width, room.height);
            break;
        case ROOM_SHAPES.L_SHAPE:
            cutLShapedRoom(room.x, room.y, room.width, room.height);
            break;
        case ROOM_SHAPES.T_SHAPE:
            cutTShapedRoom(room.x, room.y, room.width, room.height);
            break;
        case ROOM_SHAPES.CROSS:
            cutCrossShapedRoom(room.x, room.y, room.width, room.height);
            break;
    }
}

/**
 * Создание прохода между двумя комнатами
 */
function createCorridor(room1, room2) {
    // Центр каждой комнаты
    const x1 = room1.x + Math.floor(room1.width / 2);
    const y1 = room1.y + Math.floor(room1.height / 2);
    const x2 = room2.x + Math.floor(room2.width / 2);
    const y2 = room2.y + Math.floor(room2.height / 2);
    
    // Горизонтальный коридор
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    for (let x = minX; x <= maxX; x++) {
        if (x >= 0 && x < MAP_WIDTH && y1 >= 0 && y1 < MAP_HEIGHT) {
            MAP[y1][x] = 0;
        }
    }
    
    // Вертикальный коридор
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    for (let y = minY; y <= maxY; y++) {
        if (x2 >= 0 && x2 < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
            MAP[y][x2] = 0;
        }
    }
}

/**
 * Добавление препятствий внутри комнаты
 */
/**
 * Проверка валидности позиции спавна игрока
 * @param {number} x - X координата в пикселях
 * @param {number} y - Y координата в пикселях
 * @returns {boolean} true если позиция свободна от стен
 */
function isValidSpawnPosition(x, y) {
    const r = player.radius;
    // Увеличиваем количество контрольных точек для более точной проверки
    const points = [
        { dx: r, dy: r },
        { dx: -r, dy: r },
        { dx: r, dy: -r },
        { dx: -r, dy: -r },
        { dx: 0, dy: 0 },           // Центр
        { dx: r, dy: 0 },           // Право
        { dx: -r, dy: 0 },          // Лево
        { dx: 0, dy: r },           // Низ
        { dx: 0, dy: -r },          // Верх
        { dx: r * 0.707, dy: r * 0.707 },     // Диагональ右上
        { dx: -r * 0.707, dy: r * 0.707 },    // Диагональ左下
        { dx: r * 0.707, dy: -r * 0.707 },    // Диагональ右下
        { dx: -r * 0.707, dy: -r * 0.707 }    // Диагональ左上
    ];
    
    for (const p of points) {
        const checkX = Math.floor((x + p.dx) / TILE_SIZE);
        const checkY = Math.floor((y + p.dy) / TILE_SIZE);
        
        // Проверка границ карты
        if (checkX < 0 || checkX >= MAP_WIDTH || checkY < 0 || checkY >= MAP_HEIGHT) {
            return false;
        }
        
        // Проверка, что клетка пустая (не стена)
        if (MAP[checkY][checkX] === 1) {
            return false;
        }
    }
    
    return true;
}

/**
 * Поиск валидной позиции спавна в комнате
 * @param {Object} room - Объект комнаты
 * @returns {Object} {x, y} координаты валидной позиции спавна
 */
function findValidSpawnPosition(room) {
    const centerX = (room.x + room.width / 2) * TILE_SIZE;
    const centerY = (room.y + room.height / 2) * TILE_SIZE;
    
    // Сначала пробуем центр комнаты
    if (isValidSpawnPosition(centerX, centerY)) {
        return { x: centerX, y: centerY };
    }
    
    // Если центр занят, ищем свободную клетку в комнате
    const roomStartX = room.x * TILE_SIZE;
    const roomStartY = room.y * TILE_SIZE;
    const roomEndX = (room.x + room.width) * TILE_SIZE;
    const roomEndY = (room.y + room.height) * TILE_SIZE;
    
    // Проходим по всем клеткам комнаты, начиная от центра
    for (let offset = 0; offset < Math.min(room.width, room.height) / 2; offset++) {
        // Проверяем клетки на расстоянии offset от центра
        for (let dx = -offset; dx <= offset; dx++) {
            for (let dy = -offset; dy <= offset; dy++) {
                const checkX = centerX + dx * TILE_SIZE;
                const checkY = centerY + dy * TILE_SIZE;
                
                if (checkX >= roomStartX && checkX <= roomEndX &&
                    checkY >= roomStartY && checkY <= roomEndY) {
                    if (isValidSpawnPosition(checkX, checkY)) {
                        return { x: checkX, y: checkY };
                    }
                }
            }
        }
    }
    
    // Если ничего не нашли, возвращаем центр (даже если он занят)
    console.warn('Предупреждение: не найдена свободная клетка для спавна в комнате');
    return { x: centerX, y: centerY };
}

/**
 * Добавление препятствий в комнату
 * @param {Object} room - Объект комнаты
 * @param {number} roomIndex - Индекс комнаты (0 = первая комната, где спавнится игрок)
 */
function addObstacles(room, roomIndex = -1) {
    const obstacleCount = 3 + Math.floor(Math.random() * 4); // 3-6 препятствий (больше)
    
    // Вычисляем зону спавна для первой комнаты (индекс 0)
    let spawnZoneRadius = 0;
    let spawnZoneCenterX = 0;
    let spawnZoneCenterY = 0;
    
    if (roomIndex === 0) {
        // Для первой комнаты создаём защищённую зону спавна
        spawnZoneCenterX = room.x + room.width / 2;
        spawnZoneCenterY = room.y + room.height / 2;
        spawnZoneRadius = Math.min(room.width, room.height) * 0.55; // 55% от минимальной стороны (увеличено для защиты спавна)
    }
    
    // Массив для хранения созданных препятствий (для проверки пересечений)
    let placedObstacles = [];
    
    for (let i = 0; i < obstacleCount; i++) {
        // Размер препятствия
        const obsWidth = 2 + Math.floor(Math.random() * 3);
        const obsHeight = 2 + Math.floor(Math.random() * 3);
        
        // Позиция внутри комнаты (с отступом от краев)
        const padding = 2;
        const maxObsX = room.x + room.width - obsWidth - padding;
        const maxObsY = room.y + room.height - obsHeight - padding;
        
        let attempts = 0;
        while (attempts < 50) {
            const obsX = room.x + padding + Math.floor(Math.random() * (maxObsX - room.x - padding + 1));
            const obsY = room.y + padding + Math.floor(Math.random() * (maxObsY - room.y - padding + 1));
       
            // Проверка, что препятствие не перекрывает центр комнаты (чтобы не блокировать проход)
            const roomCenterX = room.x + room.width / 2;
            const roomCenterY = room.y + room.height / 2;
            const distToCenter = Math.sqrt(
                Math.pow((obsX + obsWidth/2) - roomCenterX, 2) +
                Math.pow((obsY + obsHeight/2) - roomCenterY, 2)
            );
       
            // Проверка, что препятствие не попадает в зону спавна (для первой комнаты)
            let distToSpawnZone = Infinity;
            if (roomIndex === 0) {
                distToSpawnZone = Math.sqrt(
                    Math.pow((obsX + obsWidth/2) - spawnZoneCenterX, 2) +
                    Math.pow((obsY + obsHeight/2) - spawnZoneCenterY, 2)
                );
            }
       
            // Проверка, что препятствие не пересекается с другими препятствиями (с отступом 1 клетка)
            let overlapsWithOther = false;
            for (let otherObs of placedObstacles) {
                // Проверяем пересечение с отступом в 1 клетку
                if (obsX - 1 < otherObs.x + otherObs.width &&
                    obsX + obsWidth + 1 > otherObs.x &&
                    obsY - 1 < otherObs.y + otherObs.height &&
                    obsY + obsHeight + 1 > otherObs.y) {
                    overlapsWithOther = true;
                    break;
                }
            }
       
            if (distToCenter > Math.min(room.width, room.height) * 0.3 &&
                distToSpawnZone > spawnZoneRadius &&
                !overlapsWithOther) {
                // Ставим препятствие
                for (let oy = obsY; oy < obsY + obsHeight && oy < MAP_HEIGHT; oy++) {
                    for (let ox = obsX; ox < obsX + obsWidth && ox < MAP_WIDTH; ox++) {
                        MAP[oy][ox] = 1; // 1 = стена
                    }
                }
                // Добавляем в список размещённых препятствий
                placedObstacles.push({ x: obsX, y: obsY, width: obsWidth, height: obsHeight });
                break;
            }
            attempts++;
        }
    }
}

/**
 * Генерация уровня с комнатами разных форм
 */
function generateLevel() {
    initEmptyMap();
    rooms = [];
    
    const roomCount = 15 + Math.floor(Math.random() * 8); // 15-22 комнат (больше комнат)
    const shapes = Object.values(ROOM_SHAPES);
    
    // Генерация комнат
    for (let i = 0; i < roomCount; i++) {
        let attempts = 0;
        const maxAttempts = 30;
        
        while (attempts < maxAttempts) {
            // Случайная форма
            const shape = shapes[Math.floor(Math.random() * shapes.length)];
            
            // Размеры в зависимости от формы
            let width, height;
            switch (shape) {
                case ROOM_SHAPES.SQUARE:
                    const size = 5 + Math.floor(Math.random() * 4); // 4-6 (меньше)
                    width = size;
                    height = size;
                    break;
                case ROOM_SHAPES.RECTANGLE:
                    if (Math.random() < 0.5) {
                        width = 5 + Math.floor(Math.random() * 5); // 4-7 (меньше)
                        height = 4 + Math.floor(Math.random() * 4); // 3-5 (меньше)
                    } else {
                        width = 4 + Math.floor(Math.random() * 4); // 3-5 (меньше)
                        height = 5 + Math.floor(Math.random() * 5); // 4-7 (меньше)
                    }
                    break;
                case ROOM_SHAPES.L_SHAPE:
                case ROOM_SHAPES.T_SHAPE:
                case ROOM_SHAPES.CROSS:
                    width = 9 + Math.floor(Math.random() * 4); // 5-8 (меньше)
                    height = 8 + Math.floor(Math.random() * 4); // 4-7 (меньше)
                    break;
                default:
                    width = 6;
                    height = 6;
            }
            
            // Случайная позиция
            const x = 1 + Math.floor(Math.random() * (MAP_WIDTH - width - 3));
            const y = 1 + Math.floor(Math.random() * (MAP_HEIGHT - height - 3));
            
            // Проверка, можно ли разместить комнату
            if (canPlaceRoom(x, y, width, height)) {
                const room = {
                    x: x,
                    y: y,
                    width: width,
                    height: height,
                    shape: shape
                };
                rooms.push(room);
                cutRoom(room);
                break;
            }
            attempts++;
        }
    }
    
    // Создание коридоров между комнатами
    for (let i = 0; i < rooms.length - 1; i++) {
        createCorridor(rooms[i], rooms[i + 1]);
    }
    
    // Добавление препятствий в комнаты (передаём индекс для первой комнаты)
    for (let i = 0; i < rooms.length; i++) {
        if (Math.random() < 0.7) { // 70% комнат имеют препятствия (больше)
            addObstacles(rooms[i], i);
        }
    }
    
    // Установка позиции игрока в первой комнате с поиском валидной позиции
    if (rooms.length > 0) {
        const spawnPos = findValidSpawnPosition(rooms[0]);
        player.x = spawnPos.x;
        player.y = spawnPos.y;
    } else {
        // Дефолтная позиция если комнаты не сгенерировались
        player.x = MAP_WIDTH * TILE_SIZE / 2;
        player.y = MAP_HEIGHT * TILE_SIZE / 2;
        console.warn('Предупреждение: комнаты не сгенерировались, установлена дефолтная позиция');
    }
    
    console.log(`Генерация уровня: ${rooms.length} комнат`);
    return rooms;
}

// Игрок
const player = {
    x: 100,
    y: 100,
    angle: 0,
    fov: Math.PI / 3, // 60 градусов
    walkSpeed: 0.5,   // Скорость обычной ходьбы
    runSpeed: 1.0,    // Скорость бега (при удержании Shift)
    rotSpeed: 0.013,
    mouseSensitivity: 0.002, // Чувствительность мыши для поворота камеры
    radius: 15, // Радиус игрока для коллизий
    health: 10, // Текущее здоровье
    maxHealth: 10, // Максимальное здоровье
    // Эффект покачивания головы (Bobbing) при движении
    bobbing: {
        phase: 0,           // Текущая фаза синусоиды для вертикального движения
        isMoving: false     // Флаг движения игрока
    },
    // Плавное ускорение/замедление движения
    forwardSpeed: 0,        // Текущая скорость движения вперед/назад
    strafeSpeed: 0,         // Текущая скорость бокового движения
    acceleration: 0.07,    // Коэффициент ускорения (0-1)
};

// Генерация уровня при запуске
generateLevel();

// Враги (чучела)
let enemies = [];

// Лут (аптечки)
let loot = [];

// Монеты
let coins = [];

// Состояние игры
let isGameOver = false;
let gameOverTime = 0; // Время, когда игрок умер (в миллисекундах)
const GAME_OVER_DELAY = 2000; // Задержка 2 секунды перед возможностью перезапуска

// Счетчик монет (собранные монеты)
let coinsCollected = 0;

// Статистика игры
let enemiesKilled = 0;

// Настройки стрельбы
const weapon = {
    isShooting: false,
    shootTimer: 0,
    recoil: 0,
    ammo: 10,           // Текущее количество патронов
    maxAmmo: 10,        // Максимальное количество патронов в магазине
    isReloading: false, // Флаг перезарядки
    reloadTimer: 0      // Таймер перезарядки
};

// Эффекты виньеток
const vignette = {
    // Темная виньетка при попадании
    hit: {
        active: false,
        intensity: 0, // 0-1
        fadeSpeed: 0.1,
        maxIntensity: 0.7
    },
    // Темно-красная виньетка при низком HP
    lowHealth: {
        active: false,
        intensity: 0, // 0-1, зависит от недостающего здоровья
        minHealthThreshold: 5 // Порог здоровья, ниже которого появляется эффект
    },
    // Направленная светло-красная виньетка со стороны атаки
    directional: {
        active: false,
        intensity: 0, // 0-1
        absoluteAngle: 0, // Абсолютный угол атаки в мире (радианы)
        fadeSpeed: 0.01, // Уменьшили скорость затухания для большей продолжительности
        maxIntensity: 0.9 // Увеличили максимальную интенсивность для яркости
    }
};

// Аудио контекст для звуков
let audioContext = null;

/**
 * Инициализация аудио контекста (должна вызываться после взаимодействия пользователя)
 */
function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

/**
 * Воспроизведение звука выстрела (синтезированный звук)
 */
function playShootSound() {
    if (!audioContext) {
        initAudio();
    }
    
    if (!audioContext) return;
    
    // Создаем осциллятор для звука выстрела
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Настройка звука выстрела (быстрый спад частоты)
    const now = audioContext.currentTime;
    oscillator.frequency.setValueAtTime(800, now);
    oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.1);
    
    // Громкость с быстрым затуханием
    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    
    oscillator.start(now);
    oscillator.stop(now + 0.1);
}

/**
 * Воспроизведение звука попадания во врага
 */
function playHitSound() {
    if (!audioContext) {
        initAudio();
    }
    
    if (!audioContext) return;
    
    const now = audioContext.currentTime;
    
    // Основной низкочастотный звук (удар)
    const oscillator1 = audioContext.createOscillator();
    const gainNode1 = audioContext.createGain();
    
    oscillator1.connect(gainNode1);
    gainNode1.connect(audioContext.destination);
    
    oscillator1.type = 'sawtooth';
    oscillator1.frequency.setValueAtTime(150, now);
    oscillator1.frequency.exponentialRampToValueAtTime(40, now + 0.15);
    
    gainNode1.gain.setValueAtTime(0.8, now);
    gainNode1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    oscillator1.start(now);
    oscillator1.stop(now + 0.15);
    
    // Дополнительный осциллятор для "мясистости" звука
    const oscillator2 = audioContext.createOscillator();
    const gainNode2 = audioContext.createGain();
    
    oscillator2.connect(gainNode2);
    gainNode2.connect(audioContext.destination);
    
    oscillator2.type = 'square';
    oscillator2.frequency.setValueAtTime(100, now);
    oscillator2.frequency.exponentialRampToValueAtTime(30, now + 0.12);
    
    gainNode2.gain.setValueAtTime(0.5, now);
    gainNode2.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    
    oscillator2.start(now);
    oscillator2.stop(now + 0.12);
}

/**
 * Воспроизведение звука выстрела врага
 */
function playEnemyShootSound() {
    if (!audioContext) {
        initAudio();
    }
    
    if (!audioContext) return;
    
    const now = audioContext.currentTime;
    
    // Звук выстрела врага (более низкий, чем у игрока)
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(400, now);
    oscillator.frequency.exponentialRampToValueAtTime(80, now + 0.15);
    
    gainNode.gain.setValueAtTime(0.25, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    oscillator.start(now);
    oscillator.stop(now + 0.15);
}

/**
 * Воспроизведение звука получения урона
 */
function playDamageSound() {
    if (!audioContext) {
        initAudio();
    }
    
    if (!audioContext) return;
    
    const now = audioContext.currentTime;
    
    // Резкий звук урона
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(200, now);
    oscillator.frequency.exponentialRampToValueAtTime(50, now + 0.1);
    
    gainNode.gain.setValueAtTime(0.4, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    
    oscillator.start(now);
    oscillator.stop(now + 0.1);
}

/**
 * Воспроизведение звука подбора аптечки
 */
function playPickupSound() {
    if (!audioContext) {
        initAudio();
    }
    
    if (!audioContext) return;
    
    const now = audioContext.currentTime;
    
    // Приятный звук подбора (высокий тон)
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(600, now);
    oscillator.frequency.linearRampToValueAtTime(1000, now + 0.05);
    
    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    
    oscillator.start(now);
    oscillator.stop(now + 0.1);
}

/**
 * Воспроизведение звука подбора монеты (синтезированный звук)
 */
function playCoinPickupSound() {
    if (!audioContext) {
        initAudio();
    }
    
    if (!audioContext) return;
    
    // Создаем осциллятор для звука монеты
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Звук монеты: высокий тон с быстрым повышением частоты
    const now = audioContext.currentTime;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(1200, now);
    oscillator.frequency.linearRampToValueAtTime(1800, now + 0.05);
    
    // Громкость с быстрым затуханием
    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    
    oscillator.start(now);
    oscillator.stop(now + 0.1);
}

/**
 * Воспроизведение звука шагов
 * @param {boolean} isRunning - флаг бега (для изменения звука)
 */
function playFootstepSound(isRunning = false) {
    if (!audioContext) {
        initAudio();
    }
    
    if (!audioContext) return;
    
    const now = audioContext.currentTime;
    
    // Основной звук шага (низкочастотный шум/удар)
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Тип волны для звука шага
    oscillator.type = 'triangle';
    
    // Частота зависит от типа движения (ходьба/бег)
    const baseFrequency = isRunning ? 100 : 60;
    oscillator.frequency.setValueAtTime(baseFrequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(baseFrequency * 0.5, now + 0.08);
    
    // Громкость зависит от типа движения
    const maxVolume = isRunning ? 0.45 : 0.30;
    gainNode.gain.setValueAtTime(maxVolume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    
    oscillator.start(now);
    oscillator.stop(now + 0.08);
}

// Переменные для управления циклическим звуком перезарядки
let reloadLoopInterval = null;
let lastReloadLoopTime = 0;

/**
 * Воспроизведение звука начала перезарядки
 */
function playReloadStartSound() {
    if (!audioContext) {
        initAudio();
    }
    
    if (!audioContext) return;
    
    const now = audioContext.currentTime;
    
    // Звук извлечения магазина (металлический щелчок)
    const oscillator1 = audioContext.createOscillator();
    const gainNode1 = audioContext.createGain();
    
    oscillator1.connect(gainNode1);
    gainNode1.connect(audioContext.destination);
    
    oscillator1.type = 'square';
    oscillator1.frequency.setValueAtTime(400, now);
    oscillator1.frequency.exponentialRampToValueAtTime(200, now + 0.05);
    
    gainNode1.gain.setValueAtTime(0.3, now);
    gainNode1.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    
    oscillator1.start(now);
    oscillator1.stop(now + 0.05);
    
    // Звук опускания магазина (низкий скользящий звук)
    const oscillator2 = audioContext.createOscillator();
    const gainNode2 = audioContext.createGain();
    
    oscillator2.connect(gainNode2);
    gainNode2.connect(audioContext.destination);
    
    oscillator2.type = 'triangle';
    oscillator2.frequency.setValueAtTime(150, now + 0.03);
    oscillator2.frequency.exponentialRampToValueAtTime(80, now + 0.15);
    
    gainNode2.gain.setValueAtTime(0, now);
    gainNode2.gain.linearRampToValueAtTime(0.25, now + 0.03);
    gainNode2.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    oscillator2.start(now + 0.03);
    oscillator2.stop(now + 0.15);
}

/**
 * Воспроизведение циклического звука во время перезарядки
 */
function playReloadLoopSound() {
    if (!audioContext) return;
    
    const now = audioContext.currentTime;
    
    // Звук вставки патрона (металлический клик)
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(600, now);
    oscillator.frequency.exponentialRampToValueAtTime(300, now + 0.03);
    
    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.03);
    
    oscillator.start(now);
    oscillator.stop(now + 0.03);
}

/**
 * Воспроизведение звука окончания перезарядки
 */
function playReloadEndSound() {
    if (!audioContext) return;
    
    const now = audioContext.currentTime;
    
    // Звук защелкивания магазина (резкий металлический звук)
    const oscillator1 = audioContext.createOscillator();
    const gainNode1 = audioContext.createGain();
    
    oscillator1.connect(gainNode1);
    gainNode1.connect(audioContext.destination);
    
    oscillator1.type = 'square';
    oscillator1.frequency.setValueAtTime(800, now);
    oscillator1.frequency.exponentialRampToValueAtTime(400, now + 0.08);
    
    gainNode1.gain.setValueAtTime(0.35, now);
    gainNode1.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    
    oscillator1.start(now);
    oscillator1.stop(now + 0.08);
    
    // Дополнительный звук взвода затвора
    const oscillator2 = audioContext.createOscillator();
    const gainNode2 = audioContext.createGain();
    
    oscillator2.connect(gainNode2);
    gainNode2.connect(audioContext.destination);
    
    oscillator2.type = 'sawtooth';
    oscillator2.frequency.setValueAtTime(300, now + 0.05);
    oscillator2.frequency.exponentialRampToValueAtTime(150, now + 0.15);
    
    gainNode2.gain.setValueAtTime(0, now);
    gainNode2.gain.linearRampToValueAtTime(0.25, now + 0.05);
    gainNode2.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    oscillator2.start(now + 0.05);
    oscillator2.stop(now + 0.15);
}

/**
 * Активация темной виньетки при попадании
 */
function activateHitVignette() {
    vignette.hit.active = true;
    vignette.hit.intensity = vignette.hit.maxIntensity;
}

/**
 * Активация направленной виньетки со стороны атаки
 * @param {number} absoluteAttackAngle - абсолютный угол направления атаки в мире (радианы)
 */
function activateDirectionalVignette(absoluteAttackAngle) {
    vignette.directional.active = true;
    vignette.directional.intensity = vignette.directional.maxIntensity;
    vignette.directional.absoluteAngle = absoluteAttackAngle;
}

/**
 * Обновление всех эффектов виньеток (вызывается каждый кадр)
 */
function updateVignettes() {
    // Обновление темной виньетки при попадании
    if (vignette.hit.active) {
        vignette.hit.intensity -= vignette.hit.fadeSpeed;
        if (vignette.hit.intensity <= 0) {
            vignette.hit.intensity = 0;
            vignette.hit.active = false;
        }
    }
    
    // Обновление темно-красной виньетки при низком HP
    if (player.health <= vignette.lowHealth.minHealthThreshold) {
        vignette.lowHealth.active = true;
        // Интенсивность зависит от недостающего здоровья (0-1)
        const healthRatio = player.health / vignette.lowHealth.minHealthThreshold;
        vignette.lowHealth.intensity = 1 - healthRatio; // чем меньше здоровья, тем интенсивнее
    } else {
        vignette.lowHealth.active = false;
        vignette.lowHealth.intensity = 0;
    }
    
    // Обновление направленной виньетки
    if (vignette.directional.active) {
        vignette.directional.intensity -= vignette.directional.fadeSpeed;
        if (vignette.directional.intensity <= 0) {
            vignette.directional.intensity = 0;
            vignette.directional.active = false;
        }
    }
}

/**
 * Отрисовка всех эффектов виньеток поверх игры
 */
function drawVignettes() {
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);
    
    // Функция для создания классической виньетки (затемнение по краям)
    function createEdgeVignette(intensity, color) {
        const gradient = ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, maxRadius
        );
        // Центр полностью прозрачный
        gradient.addColorStop(0, `rgba(${color}, 0)`);
        // Начинаем затемнение с 70% радиуса
        gradient.addColorStop(0.7, `rgba(${color}, 0)`);
        // Края с заданной интенсивностью
        gradient.addColorStop(1, `rgba(${color}, ${intensity})`);
        return gradient;
    }
    
    // Функция для создания направленной виньетки (радиальный градиент с центром за экраном)
    function createDirectionalVignette(intensity, angle) {
        // Угол angle относительный: 0 = прямо перед игроком, PI/2 = справа, -PI/2 = слева, PI = сзади
        // В Canvas: угол 0 = вправо, PI/2 = вниз
        // Но у нас: угол 0 = вперёд (центр экрана), PI/2 = вправо, -PI/2 = влево, PI = сзади
        // Нужно скорректировать: для Canvas "вверх" это -Y, поэтому инвертируем угол для sin
        
        // Вычисляем координаты центра круга ЗА пределами экрана со стороны атаки
        // Используем width и height отдельно для корректного учёта соотношения сторон
        const centerX_circle = centerX + Math.sin(angle) * width * 1.2;
        const centerY_circle = centerY - Math.cos(angle) * height * 1.2;
        
        // Радиус градиента — вычисляем расстояние до самого дальнего угла экрана
        // Но ограничиваем его, чтобы вспышка не была слишком яркой в углах
        const distances = [
            Math.sqrt((0 - centerX_circle) ** 2 + (0 - centerY_circle) ** 2),
            Math.sqrt((width - centerX_circle) ** 2 + (0 - centerY_circle) ** 2),
            Math.sqrt((0 - centerX_circle) ** 2 + (height - centerY_circle) ** 2),
            Math.sqrt((width - centerX_circle) ** 2 + (height - centerY_circle) ** 2)
        ];
        const maxDistance = Math.max(...distances);
        const radius = maxDistance * 0.75;

        // Создаем радиальный градиент с центром за экраном
        const gradient = ctx.createRadialGradient(centerX_circle, centerY_circle, 0, centerX_circle, centerY_circle, radius);

        // Максимальная интенсивность в центре (за экраном), затухание к краям
        gradient.addColorStop(0, `rgba(255, 0, 0, 1.0)`);
        gradient.addColorStop(0.2, `rgba(255, 0, 0, ${intensity * 0.8})`);
        gradient.addColorStop(0.5, `rgba(200, 0, 0, ${intensity * 0.4})`);
        gradient.addColorStop(1, `rgba(0, 0, 0, 0)`);

        return gradient;
    }
    
    // Темная виньетка при попадании (черная, по краям)
    if (vignette.hit.active && vignette.hit.intensity > 0) {
        ctx.fillStyle = createEdgeVignette(vignette.hit.intensity, '0, 0, 0');
        ctx.fillRect(0, 0, width, height);
    }
    
    // Темно-красная виньетка при низком HP (по краям)
    if (vignette.lowHealth.active && vignette.lowHealth.intensity > 0) {
        ctx.fillStyle = createEdgeVignette(vignette.lowHealth.intensity * 0.8, '100, 0, 0');
        ctx.fillRect(0, 0, width, height);
    }
    
    // Направленная светло-красная виньетка со стороны атаки
    if (vignette.directional.active && vignette.directional.intensity > 0) {
        // Вычисляем относительный угол на основе текущего угла игрока
        let relativeAngle = vignette.directional.absoluteAngle - player.angle;
        // Нормализуем угол в диапазон [-PI, PI]
        while (relativeAngle < -Math.PI) relativeAngle += Math.PI * 2;
        while (relativeAngle > Math.PI) relativeAngle -= Math.PI * 2;
        ctx.fillStyle = createDirectionalVignette(vignette.directional.intensity, relativeAngle);
        ctx.fillRect(0, 0, width, height);
    }
}

// Функция для создания врага в заданной позиции
function spawnEnemyAt(x, y) {
    enemies.push({
        x: x,
        y: y,
        radius: 25,
        height: 50, // Высота врага в мировых координатах (как у игрока)
        health: Math.floor(Math.random() * 3) + 4, // 2 или 3 HP
        isHit: false,
        hitTimer: 0,
        isDead: false,
        shootTimer: 0, // Таймер стрельбы врага
        shootInterval: 240, // Интервал между выстрелами (фреймы, ~4 секунды при 60 FPS)
        angle: 0, // Направление взгляда врага
        aimingTimer: 0, // Таймер прицеливания (отсчитывает вниз)
        aimingDelay: 90 + Math.floor(Math.random() * 60), // Задержка перед выстрелом (60-90 кадров)
        isAiming: false // Флаг прицеливания
    });
}

// Функция для создания врага в случайной комнате (кроме первой)
function spawnEnemyInRoom() {
    if (rooms.length < 2) return false;
    
    let attempts = 0;
    while (attempts < 50) {
        // Выбираем случайную комнату (не первую, где игрок)
        const roomIndex = 1 + Math.floor(Math.random() * (rooms.length - 1));
        const room = rooms[roomIndex];
        
        if (!room) continue;
        
        // Случайная позиция внутри комнаты
        const x = (room.x + room.width / 2 + (Math.random() - 0.5) * room.width * 0.6) * TILE_SIZE;
        const y = (room.y + room.height / 2 + (Math.random() - 0.5) * room.height * 0.6) * TILE_SIZE;
        
        // Проверка, чтобы не спавнить в стене
        const gridX = Math.floor(x / TILE_SIZE);
        const gridY = Math.floor(y / TILE_SIZE);
        
        if (gridX >= 0 && gridX < MAP_WIDTH && gridY >= 0 && gridY < MAP_HEIGHT && MAP[gridY][gridX] === 0) {
            // Проверка, что враг не слишком близко к игроку
            const distToPlayer = Math.sqrt((x - player.x)**2 + (y - player.y)**2);
            if (distToPlayer > TILE_SIZE * 3) {
                spawnEnemyAt(x, y);
                return true;
            }
        }
        attempts++;
    }
    return false;
}

// Функция для создания лута в заданной позиции
function spawnLootAt(x, y, isLarge = false) {
    const value = isLarge ? 8 : 4;
    loot.push({
        x: x,
        y: y,
        radius: isLarge ? 20 : 15,
        isLarge: isLarge, // Большая аптечка восстанавливает больше здоровья
        value: value, // Количество здоровья для восстановления
        healAmount: value
    });
}

// Функция для создания лута в случайной комнате
function spawnLootInRoom() {
    if (rooms.length < 2) return false;
    
    let attempts = 0;
    while (attempts < 50) {
        // Выбираем случайную комнату (не первую)
        const roomIndex = 1 + Math.floor(Math.random() * (rooms.length - 1));
        const room = rooms[roomIndex];
        
        if (!room) continue;
        
        // Случайная позиция внутри комнаты
        const x = (room.x + room.width / 2 + (Math.random() - 0.5) * room.width * 0.6) * TILE_SIZE;
        const y = (room.y + room.height / 2 + (Math.random() - 0.5) * room.height * 0.6) * TILE_SIZE;
        
        // Проверка, чтобы не спавнить в стене
        const gridX = Math.floor(x / TILE_SIZE);
        const gridY = Math.floor(y / TILE_SIZE);
        
        if (gridX >= 0 && gridX < MAP_WIDTH && gridY >= 0 && gridY < MAP_HEIGHT && MAP[gridY][gridX] === 0) {
            const isLarge = Math.random() < 0.3; // 30% шанс большой аптечки
            spawnLootAt(x, y, isLarge);
            return true;
        }
        attempts++;
    }
    return false;
}

// Функция для создания монеты в заданной позиции
function spawnCoinAt(x, y) {
    coins.push({
        x: x,
        y: y,
        radius: 12,
        value: 1 // Каждая монета даёт 1 очко
    });
}

// Функция для создания монеты в случайной комнате
function spawnCoinInRoom() {
    if (rooms.length < 1) return false;
    
    let attempts = 0;
    while (attempts < 50) {
        // Выбираем случайную комнату (включая первую)
        const roomIndex = Math.floor(Math.random() * rooms.length);
        const room = rooms[roomIndex];
        
        if (!room) continue;
        
        // Случайная позиция внутри комнаты
        const x = (room.x + room.width / 2 + (Math.random() - 0.5) * room.width * 0.6) * TILE_SIZE;
        const y = (room.y + room.height / 2 + (Math.random() - 0.5) * room.height * 0.6) * TILE_SIZE;
        
        // Проверка, чтобы не спавнить в стене
        const gridX = Math.floor(x / TILE_SIZE);
        const gridY = Math.floor(y / TILE_SIZE);
        
        if (gridX >= 0 && gridX < MAP_WIDTH && gridY >= 0 && gridY < MAP_HEIGHT && MAP[gridY][gridX] === 0) {
            // Проверка, что монета не слишком близко к игроку (для первой комнаты)
            if (roomIndex === 0) {
                const distToPlayer = Math.sqrt((x - player.x)**2 + (y - player.y)**2);
                if (distToPlayer < TILE_SIZE * 2) {
                    attempts++;
                    continue;
                }
            }
            spawnCoinAt(x, y);
            return true;
        }
        attempts++;
    }
    return false;
}

// Функция для спавна всех врагов, лута и монет после генерации уровня
function spawnEnemiesAndLoot() {
    // Очищаем старые врагов, лут и монеты
    enemies = [];
    loot = [];
    coins = [];
    
    // Количество врагов зависит от количества комнат
    const enemyCount = Math.floor(rooms.length * 1.5) + 2; // ~1.5 врага на комнату + 2
    const lootCount = Math.floor(rooms.length * 0.4); // ~0.4 аптечки на комнату
    const coinCount = rooms.length; // 1 монета на комнату
    
    // Спавн врагов
    for (let i = 0; i < enemyCount; i++) {
        spawnEnemyInRoom();
    }
    
    // Спавн лута
    for (let i = 0; i < lootCount; i++) {
        spawnLootInRoom();
    }
    
    // Спавн монет
    for (let i = 0; i < coinCount; i++) {
        spawnCoinInRoom();
    }
    
    console.log(`Спавн: ${enemies.length} врагов, ${loot.length} аптечек, ${coins.length} монет`);
}

// Инициализация врагов и лута после генерации уровня
spawnEnemiesAndLoot();

// Настройки Canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

/**
 * Функция для изменения размера canvas под размер окна
 */
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// Инициализация размера при загрузке и изменении окна
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Управление
const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    
    // Инициализация аудио при первом нажатии клавиши
    initAudio();
    
    // Обработка стрельбы при нажатии (Space или MouseLeft) - только если игра не окончена
    if ((e.code === 'Space' || e.code === 'Digit1') && !isGameOver) {
        shoot();
    }
});
window.addEventListener('keyup', (e) => keys[e.code] = false);

// Pointer Lock API для управления камерой мышью
let isPointerLocked = false;

// Запрос захвата курсора при клике на canvas (только если игра не окончена)
canvas.addEventListener('click', () => {
    if (!isPointerLocked && !isGameOver) {
        canvas.requestPointerLock();
    }
});

// Отслеживание состояния pointer lock
document.addEventListener('pointerlockchange', () => {
    isPointerLocked = document.pointerLockElement === canvas;
});

// Обработка движения мыши для поворота камеры
canvas.addEventListener('mousemove', (e) => {
    if (isPointerLocked && !isGameOver) {
        // Поворот камеры на основе движения мыши
        player.angle += e.movementX * player.mouseSensitivity;
        // Нормализация угла в диапазоне [0, 2*PI]
        if (player.angle < 0) player.angle += Math.PI * 2;
        if (player.angle >= Math.PI * 2) player.angle -= Math.PI * 2;
    }
});

// Функция завершения игры при победе (все монеты собраны)
function gameOverWin() {
    isGameOver = true;
    gameOverTime = Date.now();
    if (document.pointerLockElement === canvas) {
        document.exitPointerLock();
    }
    console.log('Победа! Все монеты собраны!');
}

// Функция рестарта игры (генерация нового уровня)
function restartGame() {
    // Сброс состояния игрока
    player.health = player.maxHealth;
    player.angle = 0;
    player.forwardSpeed = 0;
    player.strafeSpeed = 0;
    player.bobbing.phase = 0;
    player.bobbing.isMoving = false;
    
    // Сброс состояния оружия
    weapon.isShooting = false;
    weapon.shootTimer = 0;
    weapon.recoil = 0;
    weapon.ammo = weapon.maxAmmo;
    weapon.isReloading = false;
    weapon.reloadTimer = 0;
    
    // Сброс состояния игры
    isGameOver = false;
    gameOverTime = 0;
    score = 0;
    
    // Сброс статистики монет и врагов
    coinsCollected = 0;
    enemiesKilled = 0;
    
    // Сброс эффектов виньеток
    vignette.hit.active = false;
    vignette.hit.intensity = 0;
    vignette.lowHealth.active = false;
    vignette.lowHealth.intensity = 0;
    vignette.directional.active = false;
    vignette.directional.intensity = 0;
    
    // Генерация нового уровня
    generateLevel();
    spawnEnemiesAndLoot();
    
    console.log('Игра перезапущена!');
}

// Обработка клика мыши для стрельбы и перезапуска
canvas.addEventListener('mousedown', (e) => {
    // Инициализация аудио при клике мыши
    initAudio();
    
    if (e.button === 0) { // Левая кнопка мыши
        if (isGameOver) {
            // Проверяем, прошло ли достаточно времени с момента смерти
            const timeSinceDeath = Date.now() - gameOverTime;
            if (timeSinceDeath >= GAME_OVER_DELAY) {
                restartGame();
            }
        } else {
            shoot();
        }
    }
});

// Обработка нажатия клавиши R для рестарта (если игра окончена) или перезарядки (если игра идет)
window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyR') {
        if (isGameOver) {
            const timeSinceDeath = Date.now() - gameOverTime;
            if (timeSinceDeath >= GAME_OVER_DELAY) {
                restartGame();
            }
        } else {
            // Перезарядка оружия
            reloadWeapon();
        }
    }
});

/**
 * Логика перезарядки оружия
 */
function reloadWeapon() {
    // Если уже перезаряжаем или магазин полный, ничего не делаем
    if (weapon.isReloading || weapon.ammo === weapon.maxAmmo) return;
    
    // Начинаем перезарядку
    weapon.isReloading = true;
    weapon.reloadTimer = 300; // ~5 секунд при 60 FPS (увеличено для реалистичности)
    lastReloadLoopTime = 0; // Сброс таймера циклического звука
    
    // Воспроизводим звук начала перезарядки
    playReloadStartSound();
    
    console.log('Перезарядка...');
}

/**
 * Логика стрельбы
 */
function shoot() {
    // Если игра окончена, не стреляем
    if (isGameOver) return;
    
    // Если оружие уже в процессе выстрела, ничего не делаем (задержка)
    if (weapon.isShooting) return;
    
    // Если перезарядка в процессе, не стреляем
    if (weapon.isReloading) return;
    
    // Если нет патронов, не стреляем
    if (weapon.ammo <= 0) return;

    // Воспроизводим звук выстрела
    playShootSound();
    
    // Уменьшаем количество патронов
    weapon.ammo--;
    
    // Автоматическая перезарядка после выстрела последним патроном
    if (weapon.ammo === 0) {
        reloadWeapon();
    }
    
    weapon.isShooting = true;
    weapon.shootTimer = 15; // Длительность анимации выстрела
    weapon.recoil = 20; // Отдача

    // Логика попадания (Raycast к ближайшему врагу в центре)
    let closestEnemy = null;
    let closestDist = Infinity;

    for (let enemy of enemies) {
        if (enemy.isDead) continue;

        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const angleToEnemy = Math.atan2(dy, dx);
        let angleDiff = angleToEnemy - player.angle;
        
        // Нормализация угла
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

        // Проверка: находится ли враг примерно по центру (допуск 0.1 радиана)
        if (Math.abs(angleDiff) < 0.1) {
            // Дополнительная проверка: не закрывает ли стена врага
            // Для простоты проверяем, нет ли стены на прямой линии к врагу
            // (упрощенный Raycast для проверки видимости)
            if (!isWallBetween(player.x, player.y, enemy.x, enemy.y)) {
                if (dist < closestDist) {
                    closestDist = dist;
                    closestEnemy = enemy;
                }
            }
        }
    }

    if (closestEnemy) {
        closestEnemy.health--;
        closestEnemy.isHit = true;
        closestEnemy.hitTimer = 10;
        
        // Воспроизводим звук попадания
        playHitSound();
        
        if (closestEnemy.health <= 0) {
            closestEnemy.isDead = true;
            // Увеличиваем счетчик очков
            score++;
            // Увеличиваем счётчик убитых врагов для статистики
            enemiesKilled++;
            // Спавним аптечки (0-3 штуки) с уменьшенной частотой
            // 5% шанс выпадения большой аптечки (5 HP, голубой фон)
            const bigMedkitChance = Math.random();
            if (bigMedkitChance < 0.05) {
                // Большая аптечка
                loot.push({
                    x: closestEnemy.x + (Math.random() - 0.5) * 40,
                    y: closestEnemy.y + (Math.random() - 0.5) * 40,
                    type: 'big_medkit',
                    value: 5,
                    radius: 13
                });
            } else {
                // Обычные аптечки по старой логике
                const r = Math.random();
                let numMedkits;
                if (r < 0.8) numMedkits = 0;          // 50% - нет аптечек
                else if (r < 0.95) numMedkits = 1;     // 30% - одна аптечка
                else if (r < 0.98) numMedkits = 2;    // 15% - две аптечек
                else numMedkits = 3;                  // 5% - три аптечки
                for (let i = 0; i < numMedkits; i++) {
                    loot.push({
                        x: closestEnemy.x + (Math.random() - 0.5) * 40,
                        y: closestEnemy.y + (Math.random() - 0.5) * 40,
                        type: 'medkit',
                        value: 1,
                        radius: 10
                    });
                }
            }
            // Переспаун врага через время или удаление (здесь просто удаляем из массива для очистки)
            // Можно добавить логику переспауна
            setTimeout(() => {
                enemies = enemies.filter(e => e !== closestEnemy);
                spawnEnemyInRoom();
            }, 1000);
        }
    }
}

// Простая проверка видимости (есть ли стена на прямой)
function isWallBetween(x1, y1, x2, y2) {
    const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    // Динамическое количество шагов: минимум 20, максимум 100, пропорционально расстоянию
    const steps = Math.max(20, Math.min(100, Math.floor(dist / 5)));
    const dx = (x2 - x1) / steps;
    const dy = (y2 - y1) / steps;
    
    for (let i = 1; i < steps; i++) {
        const checkX = x1 + dx * i;
        const checkY = y1 + dy * i;
        const gridX = Math.floor(checkX / TILE_SIZE);
        const gridY = Math.floor(checkY / TILE_SIZE);
        
        if (gridY >= 0 && gridY < MAP_HEIGHT && gridX >= 0 && gridX < MAP_WIDTH) {
            if (MAP[gridY][gridX] === 1) return true;
        }
    }
    return false;
}

/**
 * Основной игровой цикл
 */
function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

function update() {
    // Если игра окончена, не обновляем состояние
    if (isGameOver) return;
    
    // Обновление игрока (движение и коллизии)
    let nextX = player.x;
    let nextY = player.y;

    // Определяем целевую скорость движения
    const isRunning = keys['ShiftLeft'] || keys['ShiftRight'];
    const forwardSpeed = isRunning ? player.runSpeed : player.walkSpeed;
    const backwardSpeed = player.walkSpeed; // Движение назад
    const strafeSpeed = player.walkSpeed * 0.75; // Скорость стрейфа
    
    // Вычисляем целевые скорости для forward/backward и strafe отдельно
    let targetForwardSpeed = 0;
    let targetStrafeSpeed = 0;
    
    // Движение вперед/назад (W, S, стрелки вверх/вниз)
    if (keys['KeyW'] || keys['ArrowUp']) {
        targetForwardSpeed = forwardSpeed;
    }
    if (keys['KeyS'] || keys['ArrowDown']) {
        targetForwardSpeed = -backwardSpeed;
    }
    
    // Боковое движение (A, D) - strafe
    if (keys['KeyA']) {
        targetStrafeSpeed = strafeSpeed;
    }
    if (keys['KeyD']) {
        targetStrafeSpeed = -strafeSpeed;
    }
    
    // Плавное ускорение/замедление для forward/backward компоненты
    player.forwardSpeed = player.forwardSpeed + (targetForwardSpeed - player.forwardSpeed) * player.acceleration;
    
    // Плавное ускорение/замедление для strafe компоненты
    player.strafeSpeed = player.strafeSpeed + (targetStrafeSpeed - player.strafeSpeed) * player.acceleration;
    
    // Вычисляем итоговое смещение на основе текущих скоростей
    if (player.forwardSpeed !== 0) {
        nextX += Math.cos(player.angle) * player.forwardSpeed;
        nextY += Math.sin(player.angle) * player.forwardSpeed;
    }
    
    if (player.strafeSpeed !== 0) {
        nextX += Math.cos(player.angle - Math.PI / 2) * player.strafeSpeed;
        nextY += Math.sin(player.angle - Math.PI / 2) * player.strafeSpeed;
    }
    
    // Поворот камеры (стрелки влево/вправо)
    if (keys['ArrowLeft']) {
        player.angle -= player.rotSpeed;
    }
    if (keys['ArrowRight']) {
        player.angle += player.rotSpeed;
    }

    const checkCollision = (x, y) => {
        const r = player.radius;
        // Увеличиваем количество контрольных точек для более точной проверки
        const points = [
            { dx: r, dy: r },
            { dx: -r, dy: r },
            { dx: r, dy: -r },
            { dx: -r, dy: -r },
            { dx: 0, dy: 0 },           // Центр
            { dx: r, dy: 0 },           // Право
            { dx: -r, dy: 0 },          // Лево
            { dx: 0, dy: r },           // Низ
            { dx: 0, dy: -r },          // Верх
            { dx: r * 0.707, dy: r * 0.707 },     // Диагональ右上
            { dx: -r * 0.707, dy: r * 0.707 },    // Диагональ左下
            { dx: r * 0.707, dy: -r * 0.707 },    // Диагональ右下
            { dx: -r * 0.707, dy: -r * 0.707 }    // Диагональ左上
        ];

        for (const p of points) {
            const checkX = Math.floor((x + p.dx) / TILE_SIZE);
            const checkY = Math.floor((y + p.dy) / TILE_SIZE);

            if (checkY < 0 || checkY >= MAP_HEIGHT || checkX < 0 || checkX >= MAP_WIDTH || MAP[checkY][checkX] === 1) {
                return true;
            }
        }
        return false;
    };

    if (!checkCollision(nextX, nextY)) {
        player.x = nextX;
        player.y = nextY;
    } else {
        const checkXOnly = !checkCollision(nextX, player.y);
        const checkYOnly = !checkCollision(player.x, nextY);

        if (checkXOnly) {
            player.x = nextX;
        }
        if (checkYOnly) {
            player.y = nextY;
        }
    }

    // Обновление эффекта покачивания головы (Bobbing) при движении
    // Вычисляем реальную скорость как векторную сумму (теорема Пифагора)
    const totalSpeed = Math.sqrt(
        player.forwardSpeed * player.forwardSpeed +
        player.strafeSpeed * player.strafeSpeed
    );
    const isMoving = totalSpeed > 0.01; // Движение считается активным, если скорость выше порога
    player.bobbing.isMoving = isMoving;
    
    if (isMoving) {
        // Скорость покачивания зависит от текущей скорости
        const maxBobbingSpeed = 0.08; // Максимальная скорость покачивания
        // Определяем текущую максимальную скорость (зависит от нажатого Shift)
        const isRunning = keys['ShiftLeft'] || keys['ShiftRight'];
        const currentMaxSpeed = isRunning ? player.runSpeed : player.walkSpeed;
        const speedRatio = totalSpeed / currentMaxSpeed;
        const bobbingSpeed = maxBobbingSpeed * speedRatio;
        
        // Сохраняем фазу до обновления для проверки шага
        const previousPhase = player.bobbing.phase;
        player.bobbing.phase += bobbingSpeed;
        
        // Воспроизводим звук шага при прохождении нижней точки синусоиды
        // Проверяем переход через фазу, соответствующую нижней точке (sin(phase) < -0.5)
        const bobValue = Math.sin(previousPhase);
        const newBobValue = Math.sin(player.bobbing.phase);
        
        // Проверяем, что мы вошли в зону нижней точки (для синхронизации с тряской)
        if (bobValue >= -0.5 && newBobValue < -0.5 && speedRatio > 0.8) {
            playFootstepSound(isRunning);
        }
    }

    // Обновление оружия
    if (weapon.isShooting) {
        weapon.shootTimer--;
        weapon.recoil *= 0.8;
        if (weapon.shootTimer <= 0) {
            weapon.isShooting = false;
        }
    }
    
    // Обновление перезарядки
    if (weapon.isReloading) {
        weapon.reloadTimer--;
        
        // Циклический звук во время перезарядки (каждые 0.5 секунд)
        const currentTime = Date.now();
        const loopInterval = 500; // 0.5 секунд между звуками
        if (currentTime - lastReloadLoopTime >= loopInterval) {
            playReloadLoopSound();
            lastReloadLoopTime = currentTime;
        }
        
        if (weapon.reloadTimer <= 0) {
            weapon.isReloading = false;
            weapon.ammo = weapon.maxAmmo;
            
            // Воспроизводим звук окончания перезарядки
            playReloadEndSound();
            
            console.log('Перезарядка завершена!');
        }
    }

    // Обновление врагов
    for (let enemy of enemies) {
        // Пропускаем мёртвых врагов
        if (enemy.isDead) continue;
        
        if (enemy.isHit) {
            enemy.hitTimer--;
            if (enemy.hitTimer <= 0) {
                enemy.isHit = false;
            }
        }
        
        // Вражеская стрельба
        enemy.shootTimer--;
        
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const angleToPlayer = Math.atan2(dy, dx);
        let angleDiff = angleToPlayer - enemy.angle;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        
        // Враг поворачивается к игроку, если видит его (плавный поворот)
        const turnSpeed = 0.1; // Увеличили скорость поворота
        if (Math.abs(angleDiff) < Math.PI) {
            enemy.angle += Math.sign(angleDiff) * Math.min(turnSpeed, Math.abs(angleDiff));
        }
        
        // Если игрок в поле зрения, нет стены и враг готов стрелять
        const canSeePlayer = enemy.shootTimer <= 0 && Math.abs(angleDiff) < 1.0 && dist < 1400 && !isWallBetween(enemy.x, enemy.y, player.x, player.y);
        
        if (canSeePlayer) {
            // Начинаем или продолжаем прицеливание
            if (!enemy.isAiming) {
                enemy.isAiming = true;
                enemy.aimingTimer = enemy.aimingDelay;
            }
            
            // Уменьшаем таймер прицеливания
            enemy.aimingTimer--;
            
            // Если прицеливание завершено - стреляем
            if (enemy.aimingTimer <= 0) {
                console.log('Враг стреляет!', { dist, angleDiff, enemy });
                playEnemyShootSound();
                player.health--;
                playDamageSound();
                
                // Угол от игрока к врагу (направление, откуда пришла атака)
                                // dy и dx - это (player - enemy), поэтому нужно инвертировать
                                const angleToEnemy = Math.atan2(-dy, -dx);
                                // Передаём абсолютный угол врага в мире
                                activateDirectionalVignette(angleToEnemy);
                
                enemy.shootTimer = enemy.shootInterval;
                // Сбрасываем прицеливание после выстрела
                enemy.isAiming = false;
                enemy.aimingTimer = 0;
            }
        } else {
            // Игрок не виден - сбрасываем прицеливание
            enemy.isAiming = false;
            enemy.aimingTimer = 0;
        }
    }
    
    // Сбор лута
    for (let i = loot.length - 1; i >= 0; i--) {
        const item = loot[i];
        const dist = Math.sqrt((player.x - item.x) ** 2 + (player.y - item.y) ** 2);
        if (dist < player.radius + item.radius) {
            player.health = Math.min(player.maxHealth, player.health + item.value);
            playPickupSound();
            loot.splice(i, 1);
        }
    }
    
    // Сбор монет
    for (let i = coins.length - 1; i >= 0; i--) {
        const coin = coins[i];
        const dist = Math.sqrt((player.x - coin.x) ** 2 + (player.y - coin.y) ** 2);
        if (dist < player.radius + coin.radius) {
            coinsCollected += coin.value;
            playCoinPickupSound();
            coins.splice(i, 1);
            
            // Проверка победы: все монеты собраны
            if (coins.length === 0) {
                gameOverWin();
            }
        }
    }
    
    // Обновление эффектов виньеток
    updateVignettes();
}

/**
 * Отрисовка кадра
 */
function render() {
    // Вычисляем смещение камеры для эффекта покачивания (Bobbing)
    let cameraBobY = 0;
    let cameraBobX = 0; // Горизонтальная тряска
    
    // Вычисляем реальную скорость как векторную сумму (теорема Пифагора)
    const totalSpeed = Math.sqrt(
        player.forwardSpeed * player.forwardSpeed +
        player.strafeSpeed * player.strafeSpeed
    );
    // Определяем текущую максимальную скорость (зависит от нажатого Shift)
    const isRunning = keys['ShiftLeft'] || keys['ShiftRight'];
    const currentMaxSpeed = isRunning ? player.runSpeed : player.walkSpeed;
    const speedRatio = totalSpeed / currentMaxSpeed;
    
    // Амплитуда покачивания камеры зависит от текущей скорости
    const maxBobbingAmplitude = 2; // Максимальная амплитуда
    const minBobbingAmplitude = 1; // Минимальная амплитуда
    const bobbingAmplitude = minBobbingAmplitude + (maxBobbingAmplitude - minBobbingAmplitude) * speedRatio;
    cameraBobY = Math.sin(player.bobbing.phase) * bobbingAmplitude;
    
    // Добавляем тряску в нижней точке покачивания ТОЛЬКО на полной скорости
    // Это создаёт ощущение удара стопы об землю
    const bobValue = Math.sin(player.bobbing.phase);
    if (bobValue < -0.5 && speedRatio > 0.8) { // Тряска только при скорости выше 80%
        // Тряска: быстрая синусоида с амплитудой, зависящей от глубины нижней точки
        const shakeIntensity = (bobValue + 0.5) * 2; // 0-1 в зависимости от глубины
        const shakeFrequency = isRunning ? 2 : 5; // Высокая частота для тряски
        const shakeAmplitude = isRunning ? 3 : 1; // Амплитуда тряски в пикселях
        cameraBobX = Math.sin(player.bobbing.phase * shakeFrequency) * shakeAmplitude * shakeIntensity;
    }

    // 1. Очистка и отрисовка пола/потолка со смещением линии горизонта
    const horizonY = canvas.height / 2 + cameraBobY;
    ctx.fillStyle = '#444'; // Потолок
    ctx.fillRect(0, 0, canvas.width, horizonY);
    ctx.fillStyle = '#222'; // Пол
    ctx.fillRect(0, horizonY, canvas.width, canvas.height - horizonY);

    // 2. Raycasting с сохранением zBuffer для правильного перекрытия спрайтов
    const numRays = canvas.width;
    const rayStep = player.fov / numRays;
    const zBuffer = new Array(numRays).fill(0); // Массив для хранения расстояний до стен

    // Вычисляем максимальное смещение для расширения области рендеринга
    const maxShake = Math.abs(cameraBobX);
    
    for (let i = -maxShake; i < numRays + maxShake; i++) {
        const rayAngle = (player.angle - player.fov / 2) + (i * rayStep);
        
        let rayDirX = Math.cos(rayAngle);
        let rayDirY = Math.sin(rayAngle);

        let mapX = Math.floor(player.x / TILE_SIZE);
        let mapY = Math.floor(player.y / TILE_SIZE);

        const deltaDistX = Math.abs(1 / rayDirX);
        const deltaDistY = Math.abs(1 / rayDirY);

        let stepX, stepY;
        let sideDistX, sideDistY;

        if (rayDirX < 0) {
            stepX = -1;
            sideDistX = (player.x / TILE_SIZE - mapX) * deltaDistX;
        } else {
            stepX = 1;
            sideDistX = (mapX + 1 - player.x / TILE_SIZE) * deltaDistX;
        }

        if (rayDirY < 0) {
            stepY = -1;
            sideDistY = (player.y / TILE_SIZE - mapY) * deltaDistY;
        } else {
            stepY = 1;
            sideDistY = (mapY + 1 - player.y / TILE_SIZE) * deltaDistY;
        }

        // DDA
        let hit = false;
        let side = 0; // 0 для X, 1 для Y

        while (!hit) {
            if (sideDistX < sideDistY) {
                sideDistX += deltaDistX;
                mapX += stepX;
                side = 0;
            } else {
                sideDistY += deltaDistY;
                mapY += stepY;
                side = 1;
            }

            if (MAP[mapY] && MAP[mapY][mapX] > 0) {
                hit = true;
            } else if (mapY < 0 || mapY >= MAP.length || mapX < 0 || mapX >= MAP[0].length) {
                // Выход за границы карты
                hit = true;
                side = 0;
            }
        }

        // Расстояние до стены
        let perpWallDist;
        if (side === 0) {
            perpWallDist = (sideDistX - deltaDistX);
        } else {
            perpWallDist = (sideDistY - deltaDistY);
        }

        // Сохраняем расстояние в zBuffer (только для видимой области экрана)
        const screenX = Math.floor(i + cameraBobX);
        if (screenX >= 0 && screenX < numRays) {
            zBuffer[screenX] = perpWallDist;
        }

        // Высота стены
        const lineHeight = canvas.height / perpWallDist;
    
        // Эффект тумана (fog)
        // Начинается на minDistance, заканчивается на maxDistance
        const minDistance = 0.3;
        const maxDistance = 5;
        let fogFactor = (perpWallDist - minDistance) / (maxDistance - minDistance);
        fogFactor = Math.max(0, Math.min(1, fogFactor));
        
        // Базовые цвета стен (бежевый)
        const colorX = { r: 245, g: 245, b: 220 }; // Beige
        const colorY = { r: 225, g: 225, b: 200 }; // Light Beige
      
        const baseColor = side === 0 ? colorX : colorY;
        
        // Вычисляем итоговый цвет с учетом тумана (смешиваем с цветом потолка #444)
        const fogColor = { r: 68, g: 68, b: 68 }; // #444
      
        const r = Math.floor(baseColor.r * (1 - fogFactor) + fogColor.r * fogFactor);
        const g = Math.floor(baseColor.g * (1 - fogFactor) + fogColor.g * fogFactor);
        const b = Math.floor(baseColor.b * (1 - fogFactor) + fogColor.b * fogFactor);
        
        ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
        
        // Отрисовка вертикальной линии со смещением горизонта и горизонтальной тряской
        // Рисуем только если линия попадает в пределы экрана
        if (screenX >= 0 && screenX < canvas.width) {
            ctx.beginPath();
            ctx.moveTo(screenX, horizonY - lineHeight / 2);
            ctx.lineTo(screenX, horizonY + lineHeight / 2);
            ctx.stroke();
        }
    }

    // 3. Глобальный слой тумана (накрывает всё: пол, потолок и стены)
    const fogGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    fogGradient.addColorStop(0, 'rgba(68, 66, 68, 0.3)');   // Прозрачный сверху
    fogGradient.addColorStop(0.5, 'rgba(68, 68, 68, 0.7)'); // Густой на горизонте
    fogGradient.addColorStop(1, 'rgba(68, 68, 68, 0.3)');   // Прозрачный снизу
    
    ctx.fillStyle = fogGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 4. Отрисовка миникарты
    renderMinimap();

    // 5. Отрисовка врагов (спрайты)
    renderEnemies(zBuffer, cameraBobY, cameraBobX);
    
    // 6. Отрисовка лута (аптечки)
    renderLoot(zBuffer, cameraBobY, cameraBobX);
    
    // 6.5. Отрисовка монет
    renderCoins(zBuffer, cameraBobY, cameraBobX);

    // 7. Отрисовка оружия (пистолет)
    renderWeapon();
    
    // 7.5. Отрисовка эффектов виньеток (попадание, низкое здоровье, направление атаки)
    drawVignettes();
    
    // 8. Отрисовка счетчика очков
    renderScore();
    
    // 8. Отрисовка здоровья
    renderHealth();
    
    // 8. Отрисовка патронов
    renderAmmo();
    
    // 9. Проверка Game Over
    if (player.health <= 0 && !isGameOver) {
        isGameOver = true;
        gameOverTime = Date.now();
        // Выход из pointer lock при смерти
        if (document.pointerLockElement === canvas) {
            document.exitPointerLock();
        }
    }
    
    // 10. Отрисовка экрана смерти, если игра окончена
    if (isGameOver) {
        renderGameOver();
    }
}

/**
 * Отрисовка счетчика очков в правом верхнем углу
 */
function renderScore() {
    const margin = 20;
    const x = canvas.width - margin;
    const y = margin;
    
    // Фон для счетчика (полупрозрачный черный)
    const text = `Монеты: ${coinsCollected}`;
    ctx.font = 'bold 24px Arial';
    const textWidth = ctx.measureText(text).width;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(x - textWidth - 10, y - 20, textWidth + 20, 35);
    
    // Текст счетчика (желтый цвет для контраста)
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'right';
    ctx.fillText(text, x - 10, y + 10);
    
    // Сбрасываем выравнивание текста обратно по умолчанию
    ctx.textAlign = 'left';
}

/**
 * Отрисовка здоровья в левом нижнем углу
 */
function renderHealth() {
    const margin = 20;
    const x = margin;
    const y = canvas.height - margin;
    
    // Фон для здоровья (полупрозрачный черный)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(x, y - 35, 150, 45);
    
    // Текст здоровья (красный цвет)
    ctx.fillStyle = '#FF0000';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'left';
    // Текст внутри прямоугольника, по вертикали по центру
    // y - 35 - верхний край прямоугольника, высота 45 -> середина на y - 35 + 22.5 = y - 12.5
    // Базовая линия текста должна быть примерно на половине высоты текста ниже центра
    // Используем y - 10 для лучшего визуального выравнивания
    ctx.fillText(`HP: ${player.health}/${player.maxHealth}`, x + 10, y - 10);
    
    // Сбрасываем выравнивание текста обратно по умолчанию
    ctx.textAlign = 'left';
}

/**
 * Отрисовка количества патронов в правом нижнем углу
 */
function renderAmmo() {
    const margin = 20;
    const x = canvas.width - margin;
    const y = canvas.height - margin;
    
    // Фон для патронов (полупрозрачный черный)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(x - 100, y - 35, 110, 45);
    
    // Текст патронов (желтый цвет для контраста)
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'right';
    
    // Показываем текущие патроны / знак бесконечности
    let ammoText = `${weapon.ammo}/∞`;
    
    // Если перезарядка в процессе, показываем индикатор
    if (weapon.isReloading) {
        ammoText = 'Перезарядка...';
    }
    
    // Текст внутри прямоугольника, по вертикали по центру
    ctx.fillText(ammoText, x - 10, y - 10);
    
    // Сбрасываем выравнивание текста обратно по умолчанию
    ctx.textAlign = 'left';
}

/**
 * Отрисовка экрана Game Over
 */
function renderGameOver() {
    // Затемнение фона
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Определяем, победа или поражение
    const isVictory = coins.length === 0 && coinsCollected > 0;
    
    // Текст Game Over или Victory
    ctx.fillStyle = isVictory ? '#00FF00' : '#FF0000';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(isVictory ? 'VICTORY!' : 'GAME OVER', canvas.width / 2, canvas.height / 2 - 80);
    
    // Статистика
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '24px Arial';
    ctx.fillText(`Собранные монеты: ${coinsCollected}`, canvas.width / 2, canvas.height / 2 - 20);
    ctx.fillText(`Убито врагов: ${enemiesKilled}`, canvas.width / 2, canvas.height / 2 + 20);
    
    // Сбрасываем выравнивание текста обратно по умолчанию
    ctx.textAlign = 'left';
}

function renderEnemies(zBuffer, cameraBobY = 0, cameraBobX = 0) {
    const horizonY = canvas.height / 2 + cameraBobY;
    for (let enemy of enemies) {
        if (enemy.isDead) continue;
        
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const angleToEnemy = Math.atan2(dy, dx);
        let angleDiff = angleToEnemy - player.angle;
        
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

        // Проверка: враг в поле зрения (убрали isWallBetween для плавного перекрытия)
        if (Math.abs(angleDiff) < player.fov / 2 && dist > 10) {
            const screenX = (0.5 * (angleDiff / (player.fov / 2)) + 0.5) * canvas.width + cameraBobX;
            // Вычисляем высоту спрайта на основе реальной высоты врага в мире
            // Увеличиваем высоту на 30% (умножаем на 0.91 вместо 0.7)
            const spriteHeight = canvas.height * (enemy.height || 100) / dist * 1;
            const spriteWidth = spriteHeight * 0.35; // Более реалистичные пропорции (человек уже)

            // Вычисляем границы спрайта на экране для проверки zBuffer
            const spriteLeft = Math.max(0, Math.floor(screenX - spriteWidth / 2));
            const spriteRight = Math.min(canvas.width, Math.ceil(screenX + spriteWidth / 2));

            ctx.save();
            // Вычисляем позицию спрайта: низ спрайта должен быть на полу
            // В raycasting: линия горизонта находится на canvas.height / 2
            // Спрайт должен стоять НА полу, поэтому рисуем его ВНИЗ от линии горизонта
            // Поднимаем врагов вверх на 30% от их высоты
            const spriteTopY = horizonY - spriteHeight * 0.3;
            ctx.translate(screenX, spriteTopY + spriteHeight / 2);

            // Цвета камуфляжа (хаки)
            const khakiBase = enemy.isHit ? '#4B5320' : '#556B2F'; // DarkOliveGreen (hit = darker)
            const khakiLight = enemy.isHit ? '#6B7538' : '#808000'; // Olive
            const khakiDark = enemy.isHit ? '#2F3318' : '#3B4218'; // Very dark olive
            const helmetColor = enemy.isHit ? '#3B4218' : '#4B5320'; // Helmet slightly darker
            const skinColor = enemy.isHit ? '#A0522D' : '#D2691E'; // Skin tone

            // --- Рисуем манекен в камуфляже с шлемом ПО ВЕРТИКАЛЬНЫМ СТОЛБЦАМ ---
            // Это позволяет врагам частично выглядывать из-за стен
            
            // Ноги (брюки цвета хаки)
            ctx.fillStyle = khakiBase;
            const legWidth = spriteWidth * 0.22;
            const legHeight = spriteHeight * 0.35;
            
            // Рисуем ноги по столбцам с учётом zBuffer
            for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                // Проверяем, виден ли этот столбец (враг ближе стены)
                if (dist >= zBuffer[screenXPos] * TILE_SIZE) continue;
                
                // Вычисляем относительную позицию столбца внутри спрайта
                const relativeX = (screenXPos - screenX) / spriteWidth * 2; // Нормализуем от -1 до 1
                
                // Левая нога
                if (relativeX >= -0.64 && relativeX <= -0.2) {
                    ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 + (spriteHeight - legHeight), 1, legHeight);
                }
                // Правая нога
                if (relativeX >= 0.2 && relativeX <= 0.62) {
                    ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 + (spriteHeight - legHeight), 1, legHeight);
                }
            }
            
            // Камуфляжные пятна на ногах
            ctx.fillStyle = khakiLight;
            for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                if (dist >= zBuffer[screenXPos] * TILE_SIZE) continue;
                const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                if (relativeX >= -0.56 && relativeX <= -0.16) {
                    ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 + spriteHeight * 0.7, 1, legHeight * 0.3);
                }
                if (relativeX >= 0.28 && relativeX <= 0.58) {
                    ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 + spriteHeight * 0.8, 1, legHeight * 0.25);
                }
            }
            
            // Обводка ног (рисуем по столбцам с zBuffer-проверкой)
            ctx.fillStyle = khakiDark;
            for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                if (dist >= zBuffer[screenXPos] * TILE_SIZE) continue;
                const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                // Левая нога - левая граница
                if (relativeX >= -0.64 && relativeX <= -0.60) {
                    ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 + (spriteHeight - legHeight), 1, legHeight);
                }
                // Левая нога - правая граница
                if (relativeX >= -0.24 && relativeX <= -0.20) {
                    ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 + (spriteHeight - legHeight), 1, legHeight);
                }
                // Правая нога - левая граница
                if (relativeX >= 0.20 && relativeX <= 0.24) {
                    ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 + (spriteHeight - legHeight), 1, legHeight);
                }
                // Правая нога - правая граница
                if (relativeX >= 0.58 && relativeX <= 0.62) {
                    ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 + (spriteHeight - legHeight), 1, legHeight);
                }
            }

            // Ботинки (тёмные)
            ctx.fillStyle = '#1a1a1a';
            const bootHeight = spriteHeight * 0.08;
            for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                if (dist >= zBuffer[screenXPos] * TILE_SIZE) continue;
                const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                if (relativeX >= -0.64 && relativeX <= -0.2) {
                    ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 + spriteHeight - bootHeight, 1, bootHeight);
                }
                if (relativeX >= 0.2 && relativeX <= 0.62) {
                    ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 + spriteHeight - bootHeight, 1, bootHeight);
                }
            }

            // Шея (соединяет голову с туловищем) - рисуем ПЕРЕД туловищем
            const neckWidth = spriteWidth * 0.20;
            const neckHeight = spriteHeight * 0.12;
            ctx.fillStyle = khakiDark;
            for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                if (dist >= zBuffer[screenXPos] * TILE_SIZE) continue;
                const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                if (Math.abs(relativeX) <= 0.20) {
                    ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 + spriteHeight * 0.25, 1, neckHeight);
                }
            }

            // Туловище (рубашка/жилет цвета хаки)
            ctx.fillStyle = khakiBase;
            const torsoHeight = spriteHeight * 0.35;
            const torsoTopY = -spriteHeight / 2 + spriteHeight * 0.3;
            for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                if (dist >= zBuffer[screenXPos] * TILE_SIZE) continue;
                const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                if (relativeX >= -0.64 && relativeX <= 0.64) {
                    ctx.fillRect(screenXPos - screenX, torsoTopY, 1, torsoHeight);
                }
            }
      
            // Камуфляжные пятна на туловище
            ctx.fillStyle = khakiLight;
            for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                if (dist >= zBuffer[screenXPos] * TILE_SIZE) continue;
                const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                if (relativeX >= -0.5 && relativeX <= -0.1) {
                    ctx.fillRect(screenXPos - screenX, torsoTopY + torsoHeight * 0.2, 1, torsoHeight * 0.25);
                }
                if (relativeX >= 0.1 && relativeX <= 0.45) {
                    ctx.fillRect(screenXPos - screenX, torsoTopY + torsoHeight * 0.5, 1, torsoHeight * 0.3);
                }
            }
            ctx.fillStyle = khakiDark;
            for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                if (dist >= zBuffer[screenXPos] * TILE_SIZE) continue;
                const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                if (relativeX >= -0.3 && relativeX <= -0.1) {
                    ctx.fillRect(screenXPos - screenX, torsoTopY + torsoHeight * 0.4, 1, torsoHeight * 0.2);
                }
            }
      
            // Обводка туловища (рисуем по столбцам с zBuffer-проверкой)
            ctx.fillStyle = khakiDark;
            for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                if (dist >= zBuffer[screenXPos] * TILE_SIZE) continue;
                const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                // Левая граница
                if (relativeX >= -0.64 && relativeX <= -0.60) {
                    ctx.fillRect(screenXPos - screenX, torsoTopY, 1, torsoHeight);
                }
                // Правая граница
                if (relativeX >= 0.60 && relativeX <= 0.64) {
                    ctx.fillRect(screenXPos - screenX, torsoTopY, 1, torsoHeight);
                }
            }

            // Руки (по бокам туловища)
            const armWidth = spriteWidth * 0.12;
            const armHeight = spriteHeight * 0.4;
            
            // Левая рука
            ctx.fillStyle = khakiBase;
            for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                if (dist >= zBuffer[screenXPos] * TILE_SIZE) continue;
                const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                if (relativeX >= -0.96 && relativeX <= -0.72) {
                    ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 + spriteHeight * 0.35, 1, armHeight);
                }
            }
            // Камуфляжное пятно на левой руке
            ctx.fillStyle = khakiLight;
            for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                if (dist >= zBuffer[screenXPos] * TILE_SIZE) continue;
                const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                if (relativeX >= -0.92 && relativeX <= -0.76) {
                    ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 + spriteHeight * 0.5, 1, armHeight * 0.3);
                }
            }
            // Обводка левой руки (рисуем по столбцам с zBuffer-проверкой)
            ctx.fillStyle = khakiDark;
            for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                if (dist >= zBuffer[screenXPos] * TILE_SIZE) continue;
                const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                // Левая граница
                if (relativeX >= -0.96 && relativeX <= -0.92) {
                    ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 + spriteHeight * 0.35, 1, armHeight);
                }
                // Правая граница
                if (relativeX >= -0.76 && relativeX <= -0.72) {
                    ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 + spriteHeight * 0.35, 1, armHeight);
                }
            }
            
            // Правая рука
            ctx.fillStyle = khakiBase;
            for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                if (dist >= zBuffer[screenXPos] * TILE_SIZE) continue;
                const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                if (relativeX >= 0.72 && relativeX <= 0.96) {
                    ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 + spriteHeight * 0.35, 1, armHeight);
                }
            }
            // Камуфляжное пятно на правой руке
            ctx.fillStyle = khakiLight;
            for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                if (dist >= zBuffer[screenXPos] * TILE_SIZE) continue;
                const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                if (relativeX >= 0.76 && relativeX <= 0.92) {
                    ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 + spriteHeight * 0.45, 1, armHeight * 0.35);
                }
            }
            // Обводка правой руки (рисуем по столбцам с zBuffer-проверкой)
            ctx.fillStyle = khakiDark;
            for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                if (dist >= zBuffer[screenXPos] * TILE_SIZE) continue;
                const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                // Левая граница
                if (relativeX >= 0.72 && relativeX <= 0.76) {
                    ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 + spriteHeight * 0.35, 1, armHeight);
                }
                // Правая граница
                if (relativeX >= 0.92 && relativeX <= 0.96) {
                    ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 + spriteHeight * 0.35, 1, armHeight);
                }
            }

            // Лицо (видна часть лица под шлемом) - рисуем по столбцам
            // Делаем лицо более вытянутым и узким, похожим на человеческое
            const faceWidth = spriteWidth * 0.28; // Уменьшили ширину
            const faceHeight = spriteHeight * 0.18; // Увеличили высоту
            ctx.fillStyle = skinColor;
            for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                if (dist >= zBuffer[screenXPos] * TILE_SIZE) continue;
                const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                if (Math.abs(relativeX) <= 0.28) {
                    const normalizedX = relativeX / 0.28;
                    // Используем более вытянутую форму (прямоугольник с закруглёнными краями)
                    // Вместо эллипса - более плоская кривая для реалистичной формы лица
                    const y = Math.sqrt(1 - normalizedX * normalizedX * 0.5) * 0.85;
                    const faceHeightAtX = y * faceHeight;
                    ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 + spriteHeight * 0.20 - faceHeightAtX / 2, 1, faceHeightAtX);
                }
            }

            // Шлем (полукруг сверху) - рисуем по столбцам (после лица, чтобы был перед головой)
            const helmetRadius = spriteWidth * 0.30; // Уменьшили радиус
            ctx.fillStyle = helmetColor;
            for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                if (dist >= zBuffer[screenXPos] * TILE_SIZE) continue;
                const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                if (Math.abs(relativeX) <= 0.45) { // Уменьшили ширину шлема
                    // Вычисляем высоту полукруга в этой точке
                    const normalizedX = relativeX / 0.45; // Нормализуем от -1 до 1
                    const y = Math.sqrt(1 - normalizedX * normalizedX); // Полукруг
                    const helmetHeightAtX = y * helmetRadius;
                    ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 + spriteHeight * 0.18 - helmetHeightAtX, 1, helmetHeightAtX);
                }
            }
            // Обводка шлема (рисуем по столбцам с zBuffer-проверкой)
            ctx.fillStyle = khakiDark;
            for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                if (dist >= zBuffer[screenXPos] * TILE_SIZE) continue;
                const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                if (Math.abs(relativeX) <= 0.45) { // Уменьшили ширину шлема
                    const normalizedX = relativeX / 0.45;
                    const y = Math.sqrt(1 - normalizedX * normalizedX);
                    const helmetHeightAtX = y * helmetRadius;
                    // Рисуем вертикальную линию высотой в 2 пикселя для обводки
                    ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 + spriteHeight * 0.18 - helmetHeightAtX, 1, 2);
                }
            }
            // Деталь шлема (козырёк)
            ctx.fillStyle = khakiDark;
            for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                if (dist >= zBuffer[screenXPos] * TILE_SIZE) continue;
                const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                if (Math.abs(relativeX) <= 0.40) { // Уменьшили ширину козырька
                    ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 + spriteHeight * 0.15, 1, helmetRadius * 0.15);
                }
            }

            // Лицо - глаза и рот
            const faceY = -spriteHeight / 2 + spriteHeight * 0.22;
            const eyeOffset = spriteWidth * 0.08;
            const eyeSize = spriteWidth * 0.05;
            
            // Глаза
            ctx.fillStyle = enemy.isHit ? '#8B0000' : '#000';
            for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                if (dist >= zBuffer[screenXPos] * TILE_SIZE) continue;
                const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                // Левый глаз
                if (Math.abs(relativeX - (-0.16)) <= 0.1) {
                    const normalizedX = (relativeX + 0.16) / 0.1;
                    const y = Math.sqrt(1 - normalizedX * normalizedX);
                    const eyeHeightAtX = y * eyeSize * 2;
                    ctx.fillRect(screenXPos - screenX, faceY - eyeHeightAtX / 2, 1, eyeHeightAtX);
                }
                // Правый глаз
                if (Math.abs(relativeX - 0.16) <= 0.1) {
                    const normalizedX = (relativeX - 0.16) / 0.1;
                    const y = Math.sqrt(1 - normalizedX * normalizedX);
                    const eyeHeightAtX = y * eyeSize * 2;
                    ctx.fillRect(screenXPos - screenX, faceY - eyeHeightAtX / 2, 1, eyeHeightAtX);
                }
            }

            // Рот (линия)
            ctx.strokeStyle = enemy.isHit ? '#8B0000' : '#000';
            ctx.lineWidth = 1.5;
            for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                if (dist >= zBuffer[screenXPos] * TILE_SIZE) continue;
                const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                if (Math.abs(relativeX) <= 0.2) {
                    ctx.beginPath();
                    if (enemy.isHit) {
                        // Грустный рот при попадании (дуга вниз)
                        const normalizedX = relativeX / 0.2;
                        const y = Math.sqrt(1 - normalizedX * normalizedX) * 0.1;
                        ctx.moveTo(screenXPos - screenX, faceY + faceHeight * 0.4);
                        ctx.lineTo(screenXPos - screenX, faceY + faceHeight * 0.4 + y * faceHeight * 0.35);
                    } else {
                        // Нейтральный рот (прямая линия)
                        ctx.moveTo(screenXPos - screenX, faceY + faceHeight * 0.4);
                        ctx.lineTo(screenXPos - screenX, faceY + faceHeight * 0.4);
                    }
                    ctx.stroke();
                }
            }

            // "X" на шлеме при попадании
            if (enemy.isHit) {
                ctx.strokeStyle = '#FF0000';
                ctx.lineWidth = 2.5;
                for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                    if (dist >= zBuffer[screenXPos] * TILE_SIZE) continue;
                    const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                    if (Math.abs(relativeX) <= 0.5) {
                        const normalizedX = relativeX / 0.5;
                        // Две пересекающиеся линии
                        const y1 = Math.abs(normalizedX) * helmetRadius * 0.4;
                        const y2 = (1 - Math.abs(normalizedX)) * helmetRadius * 0.4;
                        ctx.beginPath();
                        ctx.moveTo(screenXPos - screenX, -spriteHeight / 2 + spriteHeight * 0.15 - y1);
                        ctx.lineTo(screenXPos - screenX, -spriteHeight / 2 + spriteHeight * 0.15 - y1 + 2);
                        ctx.stroke();
                    }
                }
            }

            ctx.restore();

        }
    }
}

/**
 * Отрисовка лута (аптечек) в 3D
 */
function renderLoot(zBuffer, cameraBobY = 0, cameraBobX = 0) {
    const horizonY = canvas.height / 2 + cameraBobY;
    
    for (let item of loot) {
        const dx = item.x - player.x;
        const dy = item.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const angleToItem = Math.atan2(dy, dx);
        let angleDiff = angleToItem - player.angle;
        
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        
        // Проверка: лут в поле зрения
        if (Math.abs(angleDiff) < player.fov / 2 && dist > 10 && dist < 800) {
            const screenX = (0.5 * (angleDiff / (player.fov / 2)) + 0.5) * canvas.width + cameraBobX;
            
            // Определяем параметры в зависимости от типа аптечки
            let baseHeight = canvas.height * 8 / dist; // Базовая высота
            let boxColor, crossColor, scale;
            if (item.type === 'big_medkit') {
                scale = 1.3; // Увеличиваем на 30%
                boxColor = '#87CEEB'; // Голубой фон
                crossColor = '#FF0000'; // Красный крест (можно оставить)
            } else {
                scale = 1.0;
                boxColor = '#FFFFFF'; // Белый фон
                crossColor = '#FF0000'; // Красный крест
            }
            
            const spriteHeight = baseHeight * scale;
            const spriteWidth = spriteHeight * 0.8; // Пропорции коробки
            
            // Вычисляем границы спрайта на экране для проверки zBuffer
            const spriteLeft = Math.max(0, Math.floor(screenX - spriteWidth / 2));
            const spriteRight = Math.min(canvas.width, Math.ceil(screenX + spriteWidth / 2));
            
            ctx.save();
            const spriteTopY = horizonY + spriteHeight * 1.3; // Положить на пол
            ctx.translate(screenX, spriteTopY + spriteHeight / 2);
            
            // Рисуем аптечку (коробка с красным крестом) по столбцам с учётом zBuffer
            
            // Основная коробка
            ctx.fillStyle = boxColor;
            for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                if (dist >= zBuffer[screenXPos] * TILE_SIZE) continue;
                const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                if (relativeX >= -1 && relativeX <= 1) {
                    ctx.fillRect(screenXPos - screenX, -spriteHeight / 2, 1, spriteHeight);
                }
            }
            
            // Обводка коробки (темно-серый) - рисуем по столбцам с zBuffer-проверкой
            ctx.fillStyle = '#404040';
            for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                if (dist >= zBuffer[screenXPos] * TILE_SIZE) continue;
                const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                // Левая граница
                if (relativeX >= -1.0 && relativeX <= -0.96) {
                    ctx.fillRect(screenXPos - screenX, -spriteHeight / 2, 1, spriteHeight);
                }
                // Правая граница
                if (relativeX >= 0.96 && relativeX <= 1.0) {
                    ctx.fillRect(screenXPos - screenX, -spriteHeight / 2, 1, spriteHeight);
                }
            }
            
            // Крест на коробке
            ctx.fillStyle = crossColor;
            const crossSize = spriteHeight * 0.4;
            const crossWidth = crossSize * 0.3;
            
            for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                if (dist >= zBuffer[screenXPos] * TILE_SIZE) continue;
                const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                
                // Вертикальная полоса креста
                if (relativeX >= -0.15 && relativeX <= 0.15) {
                    ctx.fillRect(screenXPos - screenX, -crossSize / 2, 1, crossSize);
                }
                
                // Горизонтальная полоса креста
                if (relativeX >= -0.5 && relativeX <= 0.5) {
                    ctx.fillRect(screenXPos - screenX, -crossWidth / 2, 1, crossWidth);
                }
            }
            
            ctx.restore();
        }
    }
}

/**
 * Отрисовка монет в 3D
 */
function renderCoins(zBuffer, cameraBobY = 0, cameraBobX = 0) {
    const horizonY = canvas.height / 2 + cameraBobY;
    
    for (let coin of coins) {
        const dx = coin.x - player.x;
        const dy = coin.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const angleToCoin = Math.atan2(dy, dx);
        let angleDiff = angleToCoin - player.angle;
        
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        
        // Проверка: монета в поле зрения
        if (Math.abs(angleDiff) < player.fov / 2 && dist > 10 && dist < 800) {
            const screenX = (0.5 * (angleDiff / (player.fov / 2)) + 0.5) * canvas.width + cameraBobX;
            
            // Базовая высота монеты
            const baseHeight = canvas.height * 6 / dist;
            const spriteHeight = baseHeight;
            const spriteWidth = spriteHeight; // Круглая форма
            
            // Вычисляем границы спрайта на экране для проверки zBuffer
            const spriteLeft = Math.max(0, Math.floor(screenX - spriteWidth / 2));
            const spriteRight = Math.min(canvas.width, Math.ceil(screenX + spriteWidth / 2));
        
            ctx.save();
            const spriteTopY = horizonY + spriteHeight * 1.3; // Положить на пол
            ctx.translate(screenX, spriteTopY + spriteHeight / 2);
        
            // Рисуем монету (золотой круг) по столбцам с учётом zBuffer
            ctx.fillStyle = '#FFD700'; // Золотой цвет
            for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                if (dist >= zBuffer[screenXPos] * TILE_SIZE) continue;
                const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                if (relativeX >= -1 && relativeX <= 1) {
                    // Рисуем круглую форму (монету)
                    const y = Math.sqrt(1 - relativeX * relativeX) * spriteHeight / 2;
                    ctx.fillRect(screenXPos - screenX, -y, 1, y * 2);
                }
            }
            
            // Блик на монете (светло-жёлтый)
            ctx.fillStyle = '#FFFACD';
            for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                if (dist >= zBuffer[screenXPos] * TILE_SIZE) continue;
                const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                if (relativeX >= -0.4 && relativeX <= -0.2) {
                    const y = Math.sqrt(1 - relativeX * relativeX) * spriteHeight / 4;
                    ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 - y, 1, y * 2);
                }
            }
            
            ctx.restore();
        }
    }
}

function renderWeapon() {
    // Вычисляем масштаб оружия относительно размера экрана
    const scale = Math.min(canvas.width, canvas.height) / 800; // Базовый размер для 800px экрана
    
    // Позиционируем оружие по центру экрана внизу
    const weaponX = canvas.width / 2;
    const weaponY = canvas.height;
    
    // Эффект покачивания головы (Bobbing) при движении
    // Вертикальное смещение по синусоиде
    let bobbingOffsetY = 0;
    let bobbingOffsetX = 0; // Горизонтальная тряска
    
    // Вычисляем реальную скорость как векторную сумму (теорема Пифагора)
    const totalSpeed = Math.sqrt(
        player.forwardSpeed * player.forwardSpeed +
        player.strafeSpeed * player.strafeSpeed
    );
    // Определяем текущую максимальную скорость (зависит от нажатого Shift)
    const isRunning = keys['ShiftLeft'] || keys['ShiftRight'];
    const currentMaxSpeed = isRunning ? player.runSpeed : player.walkSpeed;
    const speedRatio = totalSpeed / currentMaxSpeed;
    
    // Амплитуда покачивания оружия зависит от текущей скорости
    const maxBobbingAmplitude = 6; // Максимальная амплитуда
    const minBobbingAmplitude = 3; // Минимальная амплитуда
    const bobbingAmplitude = minBobbingAmplitude + (maxBobbingAmplitude - minBobbingAmplitude) * speedRatio;
    bobbingOffsetY = Math.sin(player.bobbing.phase) * bobbingAmplitude;
    
    // Добавляем тряску в нижней точке покачивания ТОЛЬКО на полной скорости
    const bobValue = Math.sin(player.bobbing.phase);
    if (bobValue < -0.5 && speedRatio > 0.8) { // Тряска только при скорости выше 80%
        const shakeIntensity = (bobValue + 0.5) * 2; // 0-1 в зависимости от глубины
        const shakeFrequency = 20; // Высокая частота для тряски
        const shakeAmplitude = 1.5; // Амплитуда тряски в пикселях
        bobbingOffsetX = Math.sin(player.bobbing.phase * shakeFrequency) * shakeAmplitude * shakeIntensity;
    }
    
    ctx.save();
    ctx.translate(weaponX + bobbingOffsetX, weaponY + weapon.recoil + bobbingOffsetY);
    ctx.scale(scale, scale);

    // --- Рисуем реалистичный пистолет (2D вид спереди) ---
    
    // Основная часть рукояти (темно-коричневый/черный)
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.moveTo(-35, 0);
    ctx.lineTo(-40, 110);
    ctx.lineTo(40, 110);
    ctx.lineTo(35, 0);
    ctx.closePath();
    ctx.fill();
    
    // Детали рукояти (текстура)
    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(-30, 40, 60, 55);
    
    // Рама пистолета (металлический серый)
    ctx.fillStyle = '#4a4a4a';
    ctx.beginPath();
    ctx.moveTo(-42, -15);
    ctx.lineTo(-42, 15);
    ctx.lineTo(42, 15);
    ctx.lineTo(42, -15);
    ctx.closePath();
    ctx.fill();
    
    // Верхняя часть рамы (более светлая)
    ctx.fillStyle = '#5a5a5a';
    ctx.fillRect(-40, -20, 80, 12);
    
    // Ствол (цилиндр, черный)
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(-18, -85, 36, 75);
    
    // Верхняя часть ствола (светлее для объема)
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(-14, -85, 28, 75);
    
    // Дуло ствола
    ctx.fillStyle = '#000';
    ctx.fillRect(-12, -88, 24, 6);
    
    // Спусковая скоба
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 35, 18, Math.PI, 0);
    ctx.stroke();
    
    // Спусковой крючок
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(0, 35, 6, Math.PI, 0);
    ctx.fill();
    
    // Затвор/скользящая часть (верхняя металлическая часть)
    ctx.fillStyle = '#3d3d3d';
    ctx.fillRect(-45, -35, 90, 25);
    
    // Детали затвора (ребра)
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(-42, -30, 12, 18);
    ctx.fillRect(30, -30, 12, 18);
    
    // Боковые детали (для объема)
    ctx.fillStyle = '#252525';
    ctx.fillRect(-48, -28, 8, 35);
    ctx.fillRect(40, -28, 8, 35);
    
    // --- Эффект выстрела (вспышка из дула) ---
    if (weapon.isShooting && weapon.shootTimer > 5) {
        // Внешнее пламя (большое, оранжевое)
        ctx.fillStyle = 'rgba(255, 200, 50, 0.8)';
        ctx.beginPath();
        ctx.moveTo(-30, -85);
        ctx.lineTo(0, -130);
        ctx.lineTo(30, -85);
        ctx.closePath();
        ctx.fill();
        
        // Внутренняя вспышка (желтая)
        ctx.fillStyle = 'rgba(255, 255, 100, 0.9)';
        ctx.beginPath();
        ctx.moveTo(-18, -85);
        ctx.lineTo(0, -110);
        ctx.lineTo(18, -85);
        ctx.closePath();
        ctx.fill();
        
        // Ядро вспышки (белое)
        ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
        ctx.beginPath();
        ctx.arc(0, -90, 12, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

/**
 * Отрисовка миникарты
 */
function renderMinimap() {
    // Размер миникарты: четверть минимальной стороны экрана
    // Если монитор (width > height), то четверть высоты
    // Если смартфон (width <= height), то четверть ширины
    const minimapSize = canvas.width > canvas.height
        ? canvas.height / 4
        : canvas.width / 4;
    
    const margin = 20;
    const mapScale = minimapSize / Math.max(MAP_WIDTH, MAP_HEIGHT); // Масштаб, чтобы карта влезла
    const miniSize = TILE_SIZE * mapScale;
    
    const startX = margin;
    const startY = margin;

    // Фон миникарты (квадратный)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(startX, startY, minimapSize, minimapSize);

    // Отрисовка стен
    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            if (MAP[y][x] === 1) {
                ctx.fillStyle = '#888';
                ctx.fillRect(
                    startX + x * mapScale,
                    startY + y * mapScale,
                    mapScale,
                    mapScale
                );
            }
        }
    }

    // Отрисовка игрока
    const playerMiniX = startX + (player.x / TILE_SIZE) * mapScale;
    const playerMiniY = startY + (player.y / TILE_SIZE) * mapScale;

    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(playerMiniX, playerMiniY, mapScale / 2, 0, Math.PI * 2);
    ctx.fill();

    // Линия взгляда
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(playerMiniX, playerMiniY);
    ctx.lineTo(
        playerMiniX + Math.cos(player.angle) * mapScale * 2,
        playerMiniY + Math.sin(player.angle) * mapScale * 2
    );
    ctx.stroke();
    
    // Отрисовка лута на миникарте
    for (let item of loot) {
        const itemMiniX = startX + (item.x / TILE_SIZE) * mapScale;
        const itemMiniY = startY + (item.y / TILE_SIZE) * mapScale;
        ctx.fillStyle = '#00FF00'; // Зеленый цвет для аптечек
        ctx.beginPath();
        ctx.arc(itemMiniX, itemMiniY, mapScale / 3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Отрисовка монет на миникарте
    for (let coin of coins) {
        const coinMiniX = startX + (coin.x / TILE_SIZE) * mapScale;
        const coinMiniY = startY + (coin.y / TILE_SIZE) * mapScale;
        ctx.fillStyle = '#FFD700'; // Желтый цвет для монет
        ctx.beginPath();
        ctx.arc(coinMiniX, coinMiniY, mapScale / 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Запуск
gameLoop();
