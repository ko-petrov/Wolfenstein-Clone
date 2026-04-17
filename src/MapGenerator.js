/**
 * Класс для генерации карты с комнатами разных форм
 */
export class MapGenerator {
    constructor() {
        this.TILE_SIZE = 64;
        this.MAP_WIDTH = 40;
        this.MAP_HEIGHT = 40;
        
        this.ROOM_SHAPES = {
            RECTANGLE: 'rectangle',
            SQUARE: 'square',
            L_SHAPE: 'l-shape',
            T_SHAPE: 't-shape',
            CROSS: 'cross'
        };
        
        this.MAP = [];
        this.rooms = [];
    }
    
    /**
     * Инициализация пустой карты (все стены)
     */
    initEmptyMap() {
        this.MAP = [];
        for (let y = 0; y < this.MAP_HEIGHT; y++) {
            this.MAP[y] = [];
            for (let x = 0; x < this.MAP_WIDTH; x++) {
                this.MAP[y][x] = 1; // 1 = стена
            }
        }
    }
    
    /**
     * Проверка, можно ли разместить комнату в заданной позиции
     */
    canPlaceRoom(x, y, width, height) {
        // Проверка границ с отступом
        if (x < 1 || y < 1 || x + width + 1 >= this.MAP_WIDTH || y + height + 1 >= this.MAP_HEIGHT) {
            return false;
        }
        
        // Проверка пересечения с другими комнатами
        for (let room of this.rooms) {
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
    cutRectangularRoom(x, y, width, height) {
        for (let ry = y; ry < y + height; ry++) {
            for (let rx = x; rx < x + width; rx++) {
                if (rx >= 0 && rx < this.MAP_WIDTH && ry >= 0 && ry < this.MAP_HEIGHT) {
                    this.MAP[ry][rx] = 0; // 0 = пустота
                }
            }
        }
    }
    
    /**
     * Вырезание L-образной комнаты
     */
    cutLShapedRoom(x, y, width, height) {
        // Основная часть (левая вертикальная)
        const leftWidth = Math.floor(width * 0.6);
        for (let ry = y; ry < y + height; ry++) {
            for (let rx = x; rx < x + leftWidth; rx++) {
                if (rx >= 0 && rx < this.MAP_WIDTH && ry >= 0 && ry < this.MAP_HEIGHT) {
                    this.MAP[ry][rx] = 0;
                }
            }
        }
        // Нижняя часть (горизонтальная)
        const bottomHeight = Math.floor(height * 0.4);
        for (let ry = y + height - bottomHeight; ry < y + height; ry++) {
            for (let rx = x; rx < x + width; rx++) {
                if (rx >= 0 && rx < this.MAP_WIDTH && ry >= 0 && ry < this.MAP_HEIGHT) {
                    this.MAP[ry][rx] = 0;
                }
            }
        }
    }
    
    /**
     * Вырезание T-образной комнаты
     */
    cutTShapedRoom(x, y, width, height) {
        // Верхняя горизонтальная перекладина
        const topHeight = Math.floor(height * 0.3);
        for (let ry = y; ry < y + topHeight; ry++) {
            for (let rx = x; rx < x + width; rx++) {
                if (rx >= 0 && rx < this.MAP_WIDTH && ry >= 0 && ry < this.MAP_HEIGHT) {
                    this.MAP[ry][rx] = 0;
                }
            }
        }
        // Центральная вертикальная часть
        const stemWidth = Math.floor(width * 0.4);
        const stemX = x + Math.floor(width * 0.3);
        for (let ry = y + topHeight; ry < y + height; ry++) {
            for (let rx = stemX; rx < stemX + stemWidth; rx++) {
                if (rx >= 0 && rx < this.MAP_WIDTH && ry >= 0 && ry < this.MAP_HEIGHT) {
                    this.MAP[ry][rx] = 0;
                }
            }
        }
    }
    
    /**
     * Вырезание крестообразной комнаты
     */
    cutCrossShapedRoom(x, y, width, height) {
        const centerX = x + Math.floor(width / 2);
        const centerY = y + Math.floor(height / 2);
        const armWidth = Math.floor(width * 0.4);
        const armHeight = Math.floor(height * 0.4);
        
        // Горизонтальная перекладина
        for (let ry = centerY - Math.floor(armHeight / 2); ry < centerY + Math.ceil(armHeight / 2); ry++) {
            for (let rx = x; rx < x + width; rx++) {
                if (rx >= 0 && rx < this.MAP_WIDTH && ry >= 0 && ry < this.MAP_HEIGHT) {
                    this.MAP[ry][rx] = 0;
                }
            }
        }
        // Вертикальная перекладина
        for (let ry = y; ry < y + height; ry++) {
            for (let rx = centerX - Math.floor(armWidth / 2); rx < centerX + Math.ceil(armWidth / 2); rx++) {
                if (rx >= 0 && rx < this.MAP_WIDTH && ry >= 0 && ry < this.MAP_HEIGHT) {
                    this.MAP[ry][rx] = 0;
                }
            }
        }
    }
    
    /**
     * Вырезание комнаты заданной формы
     */
    cutRoom(room) {
        switch (room.shape) {
            case this.ROOM_SHAPES.RECTANGLE:
            case this.ROOM_SHAPES.SQUARE:
                this.cutRectangularRoom(room.x, room.y, room.width, room.height);
                break;
            case this.ROOM_SHAPES.L_SHAPE:
                this.cutLShapedRoom(room.x, room.y, room.width, room.height);
                break;
            case this.ROOM_SHAPES.T_SHAPE:
                this.cutTShapedRoom(room.x, room.y, room.width, room.height);
                break;
            case this.ROOM_SHAPES.CROSS:
                this.cutCrossShapedRoom(room.x, room.y, room.width, room.height);
                break;
        }
    }
    
    /**
     * Создание прохода между двумя комнатами
     */
    createCorridor(room1, room2) {
        // Центр каждой комнаты
        const x1 = room1.x + Math.floor(room1.width / 2);
        const y1 = room1.y + Math.floor(room1.height / 2);
        const x2 = room2.x + Math.floor(room2.width / 2);
        const y2 = room2.y + Math.floor(room2.height / 2);
        
        // Горизонтальный коридор
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        for (let x = minX; x <= maxX; x++) {
            if (x >= 0 && x < this.MAP_WIDTH && y1 >= 0 && y1 < this.MAP_HEIGHT) {
                this.MAP[y1][x] = 0;
            }
        }
        
        // Вертикальный коридор
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);
        for (let y = minY; y <= maxY; y++) {
            if (x2 >= 0 && x2 < this.MAP_WIDTH && y >= 0 && y < this.MAP_HEIGHT) {
                this.MAP[y][x2] = 0;
            }
        }
    }
    
    /**
     * Проверка валидности позиции спавна игрока
     * @param {number} x - X координата в пикселях
     * @param {number} y - Y координата в пикселях
     * @param {number} radius - Радиус игрока
     * @returns {boolean} true если позиция свободна от стен
     */
    isValidSpawnPosition(x, y, radius) {
        const r = radius;
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
            const checkX = Math.floor((x + p.dx) / this.TILE_SIZE);
            const checkY = Math.floor((y + p.dy) / this.TILE_SIZE);
            
            // Проверка границ карты
            if (checkX < 0 || checkX >= this.MAP_WIDTH || checkY < 0 || checkY >= this.MAP_HEIGHT) {
                return false;
            }
            
            // Проверка, что клетка пустая (не стена)
            if (this.MAP[checkY][checkX] === 1) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Поиск валидной позиции спавна в комнате
     * @param {Object} room - Объект комнаты
     * @param {number} playerRadius - Радиус игрока
     * @returns {Object} {x, y} координаты валидной позиции спавна
     */
    findValidSpawnPosition(room, playerRadius) {
        const centerX = (room.x + room.width / 2) * this.TILE_SIZE;
        const centerY = (room.y + room.height / 2) * this.TILE_SIZE;
        
        // Сначала пробуем центр комнаты
        if (this.isValidSpawnPosition(centerX, centerY, playerRadius)) {
            return { x: centerX, y: centerY };
        }
        
        // Если центр занят, ищем свободную клетку в комнате
        const roomStartX = room.x * this.TILE_SIZE;
        const roomStartY = room.y * this.TILE_SIZE;
        const roomEndX = (room.x + room.width) * this.TILE_SIZE;
        const roomEndY = (room.y + room.height) * this.TILE_SIZE;
        
        // Проходим по всем клеткам комнаты, начиная от центра
        for (let offset = 0; offset < Math.min(room.width, room.height) / 2; offset++) {
            // Проверяем клетки на расстоянии offset от центра
            for (let dx = -offset; dx <= offset; dx++) {
                for (let dy = -offset; dy <= offset; dy++) {
                    const checkX = centerX + dx * this.TILE_SIZE;
                    const checkY = centerY + dy * this.TILE_SIZE;
                    
                    if (checkX >= roomStartX && checkX <= roomEndX &&
                        checkY >= roomStartY && checkY <= roomEndY) {
                        if (this.isValidSpawnPosition(checkX, checkY, playerRadius)) {
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
    addObstacles(room, roomIndex = -1) {
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
                    for (let oy = obsY; oy < obsY + obsHeight && oy < this.MAP_HEIGHT; oy++) {
                        for (let ox = obsX; ox < obsX + obsWidth && ox < this.MAP_WIDTH; ox++) {
                            this.MAP[oy][ox] = 1; // 1 = стена
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
     * @param {number} playerRadius - Радиус игрока для проверки спавна
     * @returns {Array} Массив сгенерированных комнат
     */
    generateLevel(playerRadius) {
        this.initEmptyMap();
        this.rooms = [];
        
        const roomCount = 15 + Math.floor(Math.random() * 8); // 15-22 комнат (больше комнат)
        const shapes = Object.values(this.ROOM_SHAPES);
        
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
                    case this.ROOM_SHAPES.SQUARE:
                        const size = 5 + Math.floor(Math.random() * 4); // 4-6 (меньше)
                        width = size;
                        height = size;
                        break;
                    case this.ROOM_SHAPES.RECTANGLE:
                        if (Math.random() < 0.5) {
                            width = 5 + Math.floor(Math.random() * 5); // 4-7 (меньше)
                            height = 4 + Math.floor(Math.random() * 4); // 3-5 (меньше)
                        } else {
                            width = 4 + Math.floor(Math.random() * 4); // 3-5 (меньше)
                            height = 5 + Math.floor(Math.random() * 5); // 4-7 (меньше)
                        }
                        break;
                    case this.ROOM_SHAPES.L_SHAPE:
                    case this.ROOM_SHAPES.T_SHAPE:
                    case this.ROOM_SHAPES.CROSS:
                        width = 9 + Math.floor(Math.random() * 4); // 5-8 (меньше)
                        height = 8 + Math.floor(Math.random() * 4); // 4-7 (меньше)
                        break;
                    default:
                        width = 6;
                        height = 6;
                }
                
                // Случайная позиция
                const x = 1 + Math.floor(Math.random() * (this.MAP_WIDTH - width - 3));
                const y = 1 + Math.floor(Math.random() * (this.MAP_HEIGHT - height - 3));
                
                // Проверка, можно ли разместить комнату
                if (this.canPlaceRoom(x, y, width, height)) {
                    const room = {
                        x: x,
                        y: y,
                        width: width,
                        height: height,
                        shape: shape
                    };
                    this.rooms.push(room);
                    this.cutRoom(room);
                    break;
                }
                attempts++;
            }
        }
        
        // Создание коридоров между комнатами
        for (let i = 0; i < this.rooms.length - 1; i++) {
            this.createCorridor(this.rooms[i], this.rooms[i + 1]);
        }
        
        // Добавление препятствий в комнаты (передаём индекс для первой комнаты)
        for (let i = 0; i < this.rooms.length; i++) {
            if (Math.random() < 0.7) { // 70% комнат имеют препятствия (больше)
                this.addObstacles(this.rooms[i], i);
            }
        }
        
        // Установка позиции игрока в первой комнате с поиском валидной позиции
        let spawnPos = null;
        if (this.rooms.length > 0) {
            spawnPos = this.findValidSpawnPosition(this.rooms[0], playerRadius);
        } else {
            // Дефолтная позиция если комнаты не сгенерировались
            spawnPos = {
                x: this.MAP_WIDTH * this.TILE_SIZE / 2,
                y: this.MAP_HEIGHT * this.TILE_SIZE / 2
            };
            console.warn('Предупреждение: комнаты не сгенерировались, установлена дефолтная позиция');
        }
        
        console.log(`Генерация уровня: ${this.rooms.length} комнат`);
        return { rooms: this.rooms, spawnPos };
    }
    
    /**
     * Получить карту
     */
    getMap() {
        return this.MAP;
    }
    
    /**
     * Получить комнаты
     */
    getRooms() {
        return this.rooms;
    }
}
