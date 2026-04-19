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
            this.MAP[y] = new Array(this.MAP_WIDTH).fill(1);
        }
    }
    
    /**
     * Гарантирует, что строка карты инициализирована
     * @param {number} y - Номер строки
     */
    ensureMapRow(y) {
        if (y < 0 || y >= this.MAP_HEIGHT) return;
        if (!this.MAP[y]) {
            this.MAP[y] = new Array(this.MAP_WIDTH).fill(1);
        }
    }
    
    /**
     * Безопасная запись значения в карту
     * @param {number} x - X координата
     * @param {number} y - Y координата  
     * @param {number} value - Значение для записи
     */
    setTileSafe(x, y, value) {
        if (x < 0 || x >= this.MAP_WIDTH || y < 0 || y >= this.MAP_HEIGHT) return;
        this.ensureMapRow(y);
        this.MAP[y][x] = value;
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
                this.setTileSafe(rx, ry, 0); // 0 = пустота
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
                this.setTileSafe(rx, ry, 0);
            }
        }
        // Нижняя часть (горизонтальная)
        const bottomHeight = Math.floor(height * 0.4);
        for (let ry = y + height - bottomHeight; ry < y + height; ry++) {
            for (let rx = x; rx < x + width; rx++) {
                this.setTileSafe(rx, ry, 0);
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
                this.setTileSafe(rx, ry, 0);
            }
        }
        // Центральная вертикальная часть
        const stemWidth = Math.floor(width * 0.4);
        const stemX = x + Math.floor(width * 0.3);
        for (let ry = y + topHeight; ry < y + height; ry++) {
            for (let rx = stemX; rx < stemX + stemWidth; rx++) {
                this.setTileSafe(rx, ry, 0);
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
                this.setTileSafe(rx, ry, 0);
            }
        }
        // Вертикальная перекладина
        for (let ry = y; ry < y + height; ry++) {
            for (let rx = centerX - Math.floor(armWidth / 2); rx < centerX + Math.ceil(armWidth / 2); rx++) {
                this.setTileSafe(rx, ry, 0);
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
     * Расчет расстояния между центрами двух комнат
     * @param {Object} room1 - Первая комната
     * @param {Object} room2 - Вторая комната
     * @returns {number} Евклидово расстояние между центрами
     */
    calculateDistance(room1, room2) {
        const cx1 = room1.x + room1.width / 2;
        const cy1 = room1.y + room1.height / 2;
        const cx2 = room2.x + room2.width / 2;
        const cy2 = room2.y + room2.height / 2;
        return Math.sqrt((cx2 - cx1) ** 2 + (cy2 - cy1) ** 2);
    }
    
    /**
     * Найти точку внутри комнаты для начала/конца коридора
     * Ищет первую пустую клетку на линии от центра к указанной точке
     */
    findEntryPoint(room, targetX, targetY) {
        const cx = Math.round(room.x + room.width / 2);
        const cy = Math.round(room.y + room.height / 2);
        
        // Направление от центра к цели
        const dx = Math.sign(targetX - cx);
        const dy = Math.sign(targetY - cy);
        
        // Если цель точно по центру, выбираем горизонтальное направление
        const absDx = Math.abs(targetX - cx);
        const absDy = Math.abs(targetY - cy);
        
        // Движемся от центра к краю комнаты в направлении цели
        // Ищем первую пустую клетку (внутри комнаты)
        for (let dist = 0; dist <= Math.max(room.width, room.height); dist++) {
            const testX = cx + Math.round(dx * dist * 0.5);
            const testY = cy + Math.round(dy * dist * 0.5);
            
            // Проверяем все клетки в небольшом радиусе вокруг линии
            for (let ox = -1; ox <= 1; ox++) {
                for (let oy = -1; oy <= 1; oy++) {
                    const checkX = testX + ox;
                    const checkY = testY + oy;
                    
                    // Проверяем, что клетка внутри комнаты
                    if (checkX >= room.x && checkX < room.x + room.width &&
                        checkY >= room.y && checkY < room.y + room.height) {
                        // Проверяем, что клетка пустая
                        if (this.MAP[checkY] && this.MAP[checkY][checkX] === 0) {
                            return { x: checkX, y: checkY };
                        }
                    }
                }
            }
        }
        
        // Fallback: возвращаем центр комнаты
        return { x: cx, y: cy };
    }
    
    /**
     * Создание коридора между двумя комнатами
     * Коридор всегда проходит сквозь стены комнат для надежного соединения
     */
    createCorridor(room1, room2) {
        const center1 = { x: room1.x + room1.width / 2, y: room1.y + room1.height / 2 };
        const center2 = { x: room2.x + room2.width / 2, y: room2.y + room2.height / 2 };
        
        // Находим точки входа/выхода внутри комнат
        const p1 = this.findEntryPoint(room1, center2.x, center2.y);
        const p2 = this.findEntryPoint(room2, center1.x, center1.y);
        
        // Рисуем коридор T-образно:
        // 1. Горизонтальная линия от p1 по Y на уровне p1
        // 2. Вертикальная линия от уровня p1 до уровня p2 по X p2
        
        const minX = Math.min(p1.x, p2.x);
        const maxX = Math.max(p1.x, p2.x);
        for (let x = minX; x <= maxX; x++) {
            this.setTileSafe(x, p1.y, 0);
        }
        
        const minY = Math.min(p1.y, p2.y);
        const maxY = Math.max(p1.y, p2.y);
        for (let y = minY; y <= maxY; y++) {
            this.setTileSafe(p2.x, y, 0);
        }
    }
    
    /**
     * Соединение комнат используя алгоритм ближайших соседей (MST через Крускала)
     */
    connectClosestRooms() {
        if (this.rooms.length < 2) return;

        // Создаем список всех ребер с весами (расстояниями)
        const edges = [];
        for (let i = 0; i < this.rooms.length; i++) {
            for (let j = i + 1; j < this.rooms.length; j++) {
                const dist = this.calculateDistance(this.rooms[i], this.rooms[j]);
                edges.push({ from: i, to: j, dist });
            }
        }

        // Сортируем по расстоянию (жадный подход)
        edges.sort((a, b) => a.dist - b.dist);

        // Используем структуру Union-Find для определения компонент связности
        const parent = this.rooms.map((_, i) => i);
        const rank = new Array(this.rooms.length).fill(0);
        
        const find = (x) => {
            while (parent[x] !== x) {
                parent[x] = parent[parent[x]]; // сжатие пути
                x = parent[x];
            }
            return x;
        };
        
        const union = (x, y) => {
            const px = find(x);
            const py = find(y);
            if (px === py) return false;
            
            // По рангу
            if (rank[px] < rank[py]) {
                parent[px] = py;
            } else if (rank[px] > rank[py]) {
                parent[py] = px;
            } else {
                parent[py] = px;
                rank[px]++;
            }
            return true;
        };

        // Алгоритм Крускала: берем самые короткие ребра соединяющие разные компоненты
        let edgesUsed = 0;
        for (const edge of edges) {
            if (union(edge.from, edge.to)) {
                this.createCorridor(this.rooms[edge.from], this.rooms[edge.to]);
                edgesUsed++;
                // Все комнаты соединены
                if (edgesUsed >= this.rooms.length - 1) break;
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
        const obstacleCount = 3 + Math.floor(Math.random() * 4); // 3-6 препятствий
        
        // Вычисляем зону спавна для первой комнаты (индекс 0)
        let spawnZoneRadius = 0;
        let spawnZoneCenterX = 0;
        let spawnZoneCenterY = 0;
        
        if (roomIndex === 0) {
            // Для первой комнаты создаём защищённую зону спавна
            spawnZoneCenterX = room.x + room.width / 2;
            spawnZoneCenterY = room.y + room.height / 2;
            spawnZoneRadius = Math.min(room.width, room.height) * 0.55;
        }
        
        // Массив для хранения созданных препятствий (для проверки пересечений)
        let placedObstacles = [];
        
        for (let i = 0; i < obstacleCount; i++) {
            // Размер препятствия
            const obsWidth = 1 + Math.floor(Math.random() * 1);
            const obsHeight = 1 + Math.floor(Math.random() * 1);
            
            // Позиция внутри комнаты (с отступом от краев)
            const padding = 2;
            const maxObsX = room.x + room.width - obsWidth - padding;
            const maxObsY = room.y + room.height - obsHeight - padding;
            
            let attempts = 0;
            while (attempts < 50) {
                const obsX = room.x + padding + Math.floor(Math.random() * (maxObsX - room.x - padding + 1));
                const obsY = room.y + padding + Math.floor(Math.random() * (maxObsY - room.y - padding + 1));
           
                // Проверка, что препятствие не перекрывает центр комнаты
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
                            this.setTileSafe(ox, oy, 1); // 1 = стена
                        }
                    }
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
     * @param {number} level - Текущий уровень сложности
     * @returns {Object} Объект с комнатами и позицией спавна
     */
    generateLevel(playerRadius, level = 1) {
        this.initEmptyMap();
        this.rooms = [];
        
        // Количество комнат зависит от уровня:
        // Уровень 1: 5-6 комнат, Уровень 5: ~13 комнат, Уровень 10: ~22 комнаты
        const minRooms = 5;
        const maxRooms = 22;
        const roomIncreasePerLevel = Math.floor((maxRooms - minRooms) / 10);
        const baseRoomCount = minRooms + (level - 1) * roomIncreasePerLevel;
        const roomCount = baseRoomCount + Math.floor(Math.random() * 3);
        const shapes = Object.values(this.ROOM_SHAPES);
        
        // Генерация комнат
        for (let i = 0; i < roomCount; i++) {
            let attempts = 0;
            const maxAttempts = 50;
            let placed = false;
            
            while (attempts < maxAttempts && !placed) {
                // Случайная форма
                const shape = shapes[Math.floor(Math.random() * shapes.length)];
                
                // Размеры в зависимости от формы
                let width, height;
                switch (shape) {
                    case this.ROOM_SHAPES.SQUARE:
                        const size = 4 + Math.floor(Math.random() * 3);
                        width = size;
                        height = size;
                        break;
                    case this.ROOM_SHAPES.RECTANGLE:
                        if (Math.random() < 0.5) {
                            width = 4 + Math.floor(Math.random() * 4);
                            height = 3 + Math.floor(Math.random() * 3);
                        } else {
                            width = 3 + Math.floor(Math.random() * 3);
                            height = 4 + Math.floor(Math.random() * 4);
                        }
                        break;
                    case this.ROOM_SHAPES.L_SHAPE:
                    case this.ROOM_SHAPES.T_SHAPE:
                    case this.ROOM_SHAPES.CROSS:
                        width = 6 + Math.floor(Math.random() * 4);
                        height = 6 + Math.floor(Math.random() * 4);
                        break;
                    default:
                        width = 6;
                        height = 6;
                }
                
                let x, y;
                
                // 65% шанс разместить комнату рядом с последней, 35% — полностью случайно
                if (i > 0 && Math.random() < 0.65 && this.rooms.length > 0) {
                    // Размещаем Near последней комнаты
                    const lastRoom = this.rooms[this.rooms.length - 1];
                    const lastCx = lastRoom.x + lastRoom.width / 2;
                    const lastCy = lastRoom.y + lastRoom.height / 2;
                    
                    // Случайный угол вокруг последней комнаты
                    const angle = Math.random() * Math.PI * 2;
                    const distance = 4 + Math.floor(Math.random() * 5);
                    
                    x = Math.round(lastCx + Math.cos(angle) * distance - width / 2);
                    y = Math.round(lastCy + Math.sin(angle) * distance - height / 2);
                } else {
                    // Полностью случайная позиция
                    x = 1 + Math.floor(Math.random() * (this.MAP_WIDTH - width - 3));
                    y = 1 + Math.floor(Math.random() * (this.MAP_HEIGHT - height - 3));
                }
                
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
                    placed = true;
                }
                attempts++;
            }
        }
        
        // Создание коридоров между комнатами используя nearest neighbor (MST)
        this.connectClosestRooms();
        
        // Добавление препятствий в комнаты
        for (let i = 0; i < this.rooms.length; i++) {
            if (Math.random() < 0.7) {
                this.addObstacles(this.rooms[i], i);
            }
        }
        
        // Установка позиции игрока в первой комнате
        let spawnPos = null;
        if (this.rooms.length > 0) {
            spawnPos = this.findValidSpawnPosition(this.rooms[0], playerRadius);
        } else {
            spawnPos = {
                x: this.MAP_WIDTH * this.TILE_SIZE / 2,
                y: this.MAP_HEIGHT * this.TILE_SIZE / 2
            };
            console.warn('Комнаты не сгенерировались, установлена дефолтная позиция');
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