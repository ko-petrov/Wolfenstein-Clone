/**
 * Основной класс игры Wolfenstein Clone
 * Интегрирует всю рабочую логику из main.js
 */
import { MapGenerator } from './MapGenerator.js';
import { AudioManager } from './AudioManager.js';
import { Player } from './Player.js';
import { Enemy } from './Enemy.js';
import { GameRenderer } from './GameRenderer.js';
import { TouchController } from './TouchController.js';

// Константы
const TILE_SIZE = 64;
const MAP_WIDTH = 40;
const MAP_HEIGHT = 40;
const GAME_OVER_DELAY = 2000;
const MAX_LEVEL = 10;

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        
        // Инициализация модулей
        this.mapGenerator = new MapGenerator();
        this.audioManager = new AudioManager();
        this.player = new Player();
        this.renderer = new GameRenderer(canvas, this.width, this.height);
        
        // Состояние игры
        this.isGameOver = false;
        this.gameOverTime = 0;
        this.gameOverIsWin = false;
        this.coinsCollected = 0;
        this.enemiesKilled = 0;
        
        // Уровень
        this.currentLevel = 1;
        
        // Оружие
        this.weapon = {
            isShooting: false,
            shootTimer: 0,
            recoil: 0,
            ammo: 12,
            maxAmmo: 12,
            isReloading: false,
            reloadTimer: 0
        };
        
        // Переменные для звука перезарядки
        this.lastReloadLoopTime = 0;
        
        // Враги, лут, монеты
        this.enemies = [];
        this.loot = [];
        this.coins = [];
        
        // Карта
        this.MAP = null;
        this.rooms = [];
        
        // Управление
        this.keys = {};
        
        // Pointer Lock
        this.isPointerLocked = false;
        
        // Touch Controller
        this.touchController = new TouchController(canvas);
        this.lastTouchShoot = false;
        this.lastTouchReload = false;
        
        // Gamepad
        this.controllerData = {
            connected: false,
            leftStickX: 0,
            leftStickY: 0,
            rightStickX: 0,
            rightStickY: 0,
            runButton: false,      // LB (кнопка 4 или 6)
            triggerButton: false,  // RT (кнопка 5 или 7)
            aButton: false,         // A (кнопка 0)
            bButton: false,         // B (кнопка 1)
            lastShoot: false,       // Для отслеживания нажатия (debounce)
            lastReload: false,      // Для отслеживания нажатия (debounce)
            lastRestart: false,     // Для отслеживания нажатия (debounce)
            lastRunDebug: false     // Для отладки кнопки бега
        };
        this.controllerConnectedMessageShown = false;
        
        // Таймер неуязвимости игрока после спавна
        this.safeDuration = 3000; // 3 секунды неуязвимости
        this.safeTimer = this.safeDuration; // Инициализация в конструкторе
        
        // Таймер авторегенерации (со сбросом при получении урона)
        this.regenDelay = 5000; // задержка перед началом регена (мс)
        this.regenInterval = 1000; // интервал между регенами (мс)
        this.regenStarted = false; // флаг, был ли уже сыгран звук начала регена
        
        // Delta time для игрового цикла
        this.lastTime = 0;
        this.deltaTime = 0;
        
        // Результат генерации уровня (для респауна)
        this.spawnResult = null;
        
        // Триггер звука для ИИ врагов
        this.soundTrigger = null;
        this.soundTriggerTimer = 0;
        
        // Настройка слушателей событий
        this.setupEventListeners();
    }
    
    /**
     * Настройка слушателей событий
     */
    setupEventListeners() {
        const self = this;
        
        window.addEventListener('resize', () => self.resizeCanvas());
        
        // На мобильных используем visualViewport для корректного размера при скрытии адресной строки
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => self.resizeCanvas());
        }
        
        window.addEventListener('keydown', (e) => {
            self.keys[e.code] = true;
            
            // Инициализация аудио при первом нажатии
            if (!self.audioManager.isInitialized()) {
                self.audioManager.init();
            }
            
            // Перезарядка (только когда не Game Over)
            if (e.code === 'KeyR' && !self.isGameOver) {
                self.reloadWeapon();
            }
            
            // Респаун/рестарт/переход (только когда Game Over)
            if (self.isGameOver) {
                const timeSinceDeath = Date.now() - self.gameOverTime;
                if (timeSinceDeath >= GAME_OVER_DELAY) {
                    if (e.code === 'Enter' || e.code === 'Space' || e.code === 'Digit1') {
                        if (self.gameOverIsWin) {
                            // При победе - следующий уровень
                            self.nextLevel();
                        } else {
                            // При смерти - респаун на том же уровне
                            self.respawnPlayer();
                        }
                    }
                }
            }
            
            // Стрельба (только когда не Game Over)
            if (!self.isGameOver && (e.code === 'Digit1')) {
                self.shoot();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            self.keys[e.code] = false;
        });
        
        this.canvas.addEventListener('click', () => {
            if (!self.isPointerLocked && !self.isGameOver) {
                self.canvas.requestPointerLock();
            }
        });
        
        document.addEventListener('pointerlockchange', () => {
            self.isPointerLocked = document.pointerLockElement === self.canvas;
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (self.isPointerLocked && !self.isGameOver) {
                self.player.rotateCamera(e.movementX);
            }
        });
        
        this.canvas.addEventListener('mousedown', (e) => {
            if (!self.audioManager.isInitialized()) {
                self.audioManager.init();
            }
            
            if (e.button === 0) {
                if (self.isGameOver) {
                    const timeSinceDeath = Date.now() - self.gameOverTime;
                    if (timeSinceDeath >= GAME_OVER_DELAY) {
                        if (self.gameOverIsWin) {
                            // При победе - следующий уровень
                            self.nextLevel();
                        } else {
                            // При смерти - респаун на том же уровне
                            self.respawnPlayer();
                        }
                    }
                } else {
                    self.shoot();
                }
            }
        });
    }
    
    /**
     * Изменение размера canvas
     */
    resizeCanvas() {
        // На мобильных используем visualViewport для учета адресной строки
        const useVisualViewport = window.visualViewport;
        
        if (useVisualViewport) {
            // visualViewport дает реальный размер области просмотра (без адресной строки)
            this.canvas.width = Math.floor(useVisualViewport.width * window.devicePixelRatio);
            this.canvas.height = Math.floor(useVisualViewport.height * window.devicePixelRatio);
            this.width = this.canvas.width;
            this.height = this.canvas.height;
        } else {
            // Fallback для десктопов
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.width = this.canvas.width;
            this.height = this.canvas.height;
        }
        
        // Обновляем размер рендерера
        if (this.renderer) {
            this.renderer.width = this.width;
            this.renderer.height = this.height;
        }
    }
    
    /**
     * Расчет количества комнат для текущего уровня
     */
    getRoomCountForLevel(level) {
        // Уровень 1: 5 комнат,Level 10: 22 комнаты (максимум)
        const minRooms = 5;
        const maxRooms = 22;
        const roomIncrease = Math.min(level, Math.floor((maxRooms - minRooms) / 2));
        return minRooms + roomIncrease;
    }
    
    /**
     * Расчет количества врагов на комнату для текущего уровня
     */
    getEnemiesPerRoomForLevel(level) {
        // Уровень 1: 1-2 врага, Уровень 10: 5-6 врагов
        const minEnemies = 1;
        const maxEnemies = 6;
        const enemyIncrease = Math.min(level - 1, Math.floor((maxEnemies - minEnemies) / 2));
        return minEnemies + enemyIncrease;
    }
    
    /**
     * Инициализация и генерация уровня с учетом текущего уровня сложности
     */
    generateLevel() {
        const result = this.mapGenerator.generateLevel(this.player.radius, this.currentLevel);
        this.MAP = this.mapGenerator.getMap();
        this.rooms = this.mapGenerator.getRooms();
        
        // Сохраняем результат для респауна
        this.spawnResult = result;
        
        // Устанавливаем позицию игрока
        this.player.x = result.spawnPos.x;
        this.player.y = result.spawnPos.y;
        
        // Устанавливаем таймер неуязвимости при генерации уровня
        this.safeTimer = this.safeDuration;
        this.lastDamageTime = Date.now(); // Сброс времени урона при генерации уровня (start game)
        this.regenTimer = 0;
        this.regenStarted = false;
        console.log(`Таймер неуязвимости установлен: ${this.safeTimer}ms`);
        
        // Спавним врагов, лут и монеты
        this.spawnEntities();
        
        console.log(`Уровень ${this.currentLevel}: сгенерировано ${this.rooms.length} комнат`);
    }
    
    /**
     * Спавн врагов, лута и монет
     */
    spawnEntities() {
        this.enemies = [];
        this.loot = [];
        this.coins = [];
        
        // Спавн врагов (количество зависит от уровня, кроме первой комнаты)
        // Уровень 1: 1-2 врага, Уровень 10: 5-6 врагов на комнату
        const enemiesPerRoom = this.getEnemiesPerRoomForLevel(this.currentLevel);
        for (let i = 1; i < this.rooms.length; i++) {
            const room = this.rooms[i];
            const numEnemies = Math.floor(Math.random() * 2) + enemiesPerRoom;
            
            for (let j = 0; j < numEnemies; j++) {
                const pos = this.findRandomPositionInRoom(room);
                // Увеличена минимальная дистанция до TILE_SIZE * 5 для безопасности спавна
                if (pos && pos.distToPlayer > TILE_SIZE * 5) {
                    // Распределение: 50% normal, 30% coward, 20% assault
                    const rand = Math.random();
                    let type;
                    if (rand < 0.5) {
                        type = 'normal';
                    } else if (rand < 0.8) {
                        type = 'coward';
                    } else {
                        type = 'assault';
                    }
                    const enemy = new Enemy(pos.x, pos.y, type);
                    this.enemies.push(enemy);
                }
            }
        }
        
        // Спавн лута
        for (let i = 1; i < this.rooms.length; i++) {
            if (Math.random() < 0.4) {
                const room = this.rooms[i];
                const pos = this.findRandomPositionInRoom(room);
                if (pos) {
                    const isLarge = Math.random() < 0.3;
                    this.loot.push({
                        x: pos.x,
                        y: pos.y,
                        radius: isLarge ? 20 : 15,
                        type: isLarge ? 'big_medkit' : 'medkit',
                        value: isLarge ? 5 : 1
                    });
                }
            }
        }
        
        // Спавн монет
        for (let i = 0; i < this.rooms.length; i++) {
            const room = this.rooms[i];
            const numCoins = Math.floor(Math.random() * 2) + 1;
            
            for (let j = 0; j < numCoins; j++) {
                const pos = this.findRandomPositionInRoom(room);
                if (pos) {
                    // Для первой комнаты проверяем дистанцию от спавна игрока
                    if (i === 0 && pos.distToPlayer < TILE_SIZE * 2) {
                        continue;
                    }
                    this.coins.push({
                        x: pos.x,
                        y: pos.y,
                        radius: 12,
                        value: 1
                    });
                }
            }
        }
        
        console.log(`Спавн: ${this.enemies.length} врагов, ${this.loot.length} аптечек, ${this.coins.length} монет`);
    }
    
    /**
     * Поиск случайной позиции в комнате
     */
    findRandomPositionInRoom(room) {
        for (let attempt = 0; attempt < 50; attempt++) {
            const x = (room.x + room.width / 2 + (Math.random() - 0.5) * room.width * 0.6) * TILE_SIZE;
            const y = (room.y + room.height / 2 + (Math.random() - 0.5) * room.height * 0.6) * TILE_SIZE;
            
            const gridX = Math.floor(x / TILE_SIZE);
            const gridY = Math.floor(y / TILE_SIZE);
            
            if (gridX >= 0 && gridX < MAP_WIDTH && gridY >= 0 && gridY < MAP_HEIGHT && this.MAP[gridY][gridX] === 0) {
                const dx = x - this.player.x;
                const dy = y - this.player.y;
                const distToPlayer = Math.sqrt(dx * dx + dy * dy);
                return { x, y, distToPlayer };
            }
        }
        return null;
    }
    
    /**
     * Проверка стены между точками
     */
    isWallBetween(x1, y1, x2, y2) {
        const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        const steps = Math.max(20, Math.min(100, Math.floor(dist / 5)));
        const dx = (x2 - x1) / steps;
        const dy = (y2 - y1) / steps;
        
        for (let i = 1; i < steps; i++) {
            const checkX = x1 + dx * i;
            const checkY = y1 + dy * i;
            const gridX = Math.floor(checkX / TILE_SIZE);
            const gridY = Math.floor(checkY / TILE_SIZE);
            
            if (gridY >= 0 && gridY < MAP_HEIGHT && gridX >= 0 && gridX < MAP_WIDTH) {
                if (this.MAP[gridY][gridX] === 1) return true;
            }
        }
        return false;
    }
    
    /**
     * Проверяет коллизию для новой позиции
     */
    checkCollision(newX, newY) {
        const r = this.player.radius;
        const points = [
            { dx: r, dy: r }, { dx: -r, dy: r }, { dx: r, dy: -r }, { dx: -r, dy: -r },
            { dx: 0, dy: 0 }, { dx: r, dy: 0 }, { dx: -r, dy: 0 }, { dx: 0, dy: r }, { dx: 0, dy: -r }
        ];

        for (const p of points) {
            const checkX = Math.floor((newX + p.dx) / TILE_SIZE);
            const checkY = Math.floor((newY + p.dy) / TILE_SIZE);

            if (checkY < 0 || checkY >= MAP_HEIGHT || checkX < 0 || checkX >= MAP_WIDTH || this.MAP[checkY][checkX] === 1) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * Стрельба
     */
    shoot() {
        if (this.isGameOver || this.weapon.isShooting || this.weapon.isReloading || this.weapon.ammo <= 0) {
            if (this.weapon.ammo <= 0 && !this.weapon.isReloading) {
                this.reloadWeapon();
            }
            return;
        }
        
        this.audioManager.playShootSound();
        this.weapon.ammo--;
        
        if (this.weapon.ammo === 0) {
            this.reloadWeapon();
        }
        
        this.weapon.isShooting = true;
        this.weapon.shootTimer = 15;
        this.weapon.recoil = 20;
        
        // Активация тряски камеры для отдачи оружия
        this.renderer.activateWeaponRecoilShake(1000, 15);

        // Триггер звука для ИИ врагов
        this.soundTrigger = { x: this.player.x, y: this.player.y };
        this.soundTriggerTimer = 2000; // Звук слышен в течение 2 секунд
        
        // Поиск ближайшего врага
        this.checkShootHit();
    }
    
    /**
     * Получение номера комнаты, в которой находится точка
     */
    getRoomIndexForPosition(x, y) {
        for (let i = 0; i < this.rooms.length; i++) {
            const room = this.rooms[i];
            const roomLeft = room.x * TILE_SIZE;
            const roomRight = (room.x + room.width) * TILE_SIZE;
            const roomTop = room.y * TILE_SIZE;
            const roomBottom = (room.y + room.height) * TILE_SIZE;
            
            if (x >= roomLeft && x <= roomRight && y >= roomTop && y <= roomBottom) {
                return i;
            }
        }
        return -1;
    }
    
    /**
     * Вычисляет расстояние от точки до центра комнаты
     */
    getRoomDistance(x, y, room) {
        const roomCenterX = (room.x + room.width / 2) * TILE_SIZE;
        const roomCenterY = (room.y + room.height / 2) * TILE_SIZE;
        const dx = roomCenterX - x;
        const dy = roomCenterY - y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Получает список номеров ближайших комнат к позиции игрока
     * @param {number} count - количество комнат для возврата
     * @returns {number[]} - массив номеров комнат от ближайших к далёким
     */
    getNearestRoomIndices(count) {
        const roomDistances = this.rooms.map((room, index) => ({
            index,
            distance: this.getRoomDistance(this.player.x, this.player.y, room)
        }));
        
        roomDistances.sort((a, b) => a.distance - b.distance);
        
        return roomDistances.slice(0, count).map(r => r.index);
    }
    
    /**
     * Проверяет, находится ли комната "за спиной" игрока
     * комната считается за спиной, если угол между направлением взгляда
     * и вектором к комнате больше 90 градусов (PI/2)
     */
    isRoomBehindPlayer(room) {
        const roomCenterX = (room.x + room.width / 2) * TILE_SIZE;
        const roomCenterY = (room.y + room.height / 2) * TILE_SIZE;
        
        const dx = roomCenterX - this.player.x;
        const dy = roomCenterY - this.player.y;
        const angleToRoom = Math.atan2(dy, dx);
        
        let angleDiff = angleToRoom - this.player.angle;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        
        // Если угол больше 90 градусов (PI/2), комната за спиной
        return Math.abs(angleDiff) > Math.PI / 2;
    }
    
    /**
     * Получает индекс подходящей комнаты для спавна врага
     * Исключает: комнату игрока, две ближайшие, и комнаты за спиной
     */
    getValidSpawnRoomIndex() {
        if (this.rooms.length <= 3) {
            // Если комнат меньше или равно 3, спавним в любой кроме первой
            if (this.rooms.length > 1) {
                const roomIndex = 1 + Math.floor(Math.random() * (this.rooms.length - 1));
                return roomIndex;
            }
            return -1;
        }
        
        // Получаем текущую комнату игрока и две ближайшие
        const currentRoomIndex = this.getRoomIndexForPosition(this.player.x, this.player.y);
        const nearestRoomIndices = this.getNearestRoomIndices(2);
        
        // Создаём список недопустимых комнат
        const invalidRoomIndices = new Set();
        
        // Добавляем текущую комнату игрока
        if (currentRoomIndex !== -1) {
            invalidRoomIndices.add(currentRoomIndex);
        }
        
        // Добавляем две ближайшие комнаты
        for (const idx of nearestRoomIndices) {
            invalidRoomIndices.add(idx);
        }
        
        // // Добавляем комнаты за спиной игрока
        // for (let i = 0; i < this.rooms.length; i++) {
        //     if (this.isRoomBehindPlayer(this.rooms[i])) {
        //         invalidRoomIndices.add(i);
        //     }
        // }
        
        // Собираем все допустимые комнаты
        const validRoomIndices = [];
        for (let i = 1; i < this.rooms.length; i++) { // Пропускаем первую комнату
            if (!invalidRoomIndices.has(i)) {
                validRoomIndices.push(i);
            }
        }
        
        if (validRoomIndices.length > 0) {
            // Возвращаем случайную комнату из допустимых
            const randomIndex = Math.floor(Math.random() * validRoomIndices.length);
            return validRoomIndices[randomIndex];
        }
        
        // Если все комнаты недопустимы, выбираем самую далёкую
        return this.rooms.length - 1;
    }
    
    /**
     * Проверка попадания при стрельбе
     */
    checkShootHit() {
        let closestEnemy = null;
        let closestDist = Infinity;

        for (let enemy of this.enemies) {
            if (enemy.isDead) continue;

            const dx = enemy.x - this.player.x;
            const dy = enemy.y - this.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            const angleToEnemy = Math.atan2(dy, dx);
            let angleDiff = angleToEnemy - this.player.angle;
            
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

            if (Math.abs(angleDiff) < 0.1) {
                if (!this.isWallBetween(this.player.x, this.player.y, enemy.x, enemy.y)) {
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
            
            this.audioManager.playHitSound();
            
            if (closestEnemy.health <= 0) {
                closestEnemy.isDead = true;
                this.enemiesKilled++;
                
                // Шанс выпадения аптечки
                if (Math.random() < 0.05) {
                    this.loot.push({
                        x: closestEnemy.x + (Math.random() - 0.5) * 40,
                        y: closestEnemy.y + (Math.random() - 0.5) * 40,
                        type: 'big_medkit',
                        value: 5,
                        radius: 13
                    });
                } else {
                    const r = Math.random();
                    let numMedkits = 0;
                    if (r < 0.6) numMedkits = 0;
                    else if (r < 0.95) numMedkits = 1;
                    else if (r < 0.98) numMedkits = 2;
                    else numMedkits = 3;
                    
                    for (let i = 0; i < numMedkits; i++) {
                        this.loot.push({
                            x: closestEnemy.x + (Math.random() - 0.5) * 40,
                            y: closestEnemy.y + (Math.random() - 0.5) * 40,
                            type: 'medkit',
                            value: 1,
                            radius: 10
                        });
                    }
                }
                
                // Переспаун врага
                setTimeout(() => {
                    this.enemies = this.enemies.filter(e => e !== closestEnemy);
                    // Найти подходящую комнату для нового врага
                    const validRoomIndex = this.getValidSpawnRoomIndex();
                    if (validRoomIndex !== -1) {
                        const pos = this.findRandomPositionInRoom(this.rooms[validRoomIndex]);
                        if (pos) {
                            // Спавним врага случайного типа
                            const types = ['normal', 'normal', 'normal', 'coward', 'assault'];
                            const type = types[Math.floor(Math.random() * types.length)];
                            this.enemies.push(new Enemy(pos.x, pos.y, type));
                        }
                    }
                }, 1000);
            }
        }
    }
    
    /**
     * Респаун игрока после смерти на том же уровне
     * Сохраняет геометрию комнат, но заново расставляет врагов, монеты и аптечки
     */
    respawnPlayer() {
        console.log(`🔄 Респаун игрока на уровне ${this.currentLevel}...`);
        
        // Очищаем всех текущих врагов, лут и монеты (старие объекты удаляются)
        this.enemies = [];
        this.loot = [];
        this.coins = [];
        
        // Восстанавливаем позицию игрока на спавн
        if (this.spawnResult) {
            this.player.x = this.spawnResult.spawnPos.x;
            this.player.y = this.spawnResult.spawnPos.y;
        }
        
        // Восстанавливаем угол обзора
        this.player.angle = 0;
        
        // Полный сброс состояния игрока
        this.player.reset();
        
        // Восстанавливаем HP до максимума
        this.player.health = this.player.maxHealth;
        
        // Восстанавливаем патроны
        this.weapon.ammo = this.weapon.maxAmmo;
        this.weapon.isReloading = false;
        this.weapon.reloadTimer = 0;
        
        // Сброс состояний оружия
        this.weapon.isShooting = false;
        this.weapon.shootTimer = 0;
        this.weapon.recoil = 0;
        
        // Устанавливаем таймер неуязвимости
        this.safeTimer = this.safeDuration;
        
        // Сбрасываем таймер авторегенерации
        this.regenTimer = 0;
        this.lastDamageTime = Date.now();
        this.regenStarted = false;
        
        // Сбрасываем счетчики
        this.coinsCollected = 0;
        this.enemiesKilled = 0;
        
        // Снимаем экран Game Over
        this.isGameOver = false;
        this.gameOverTime = 0;
        this.gameOverIsWin = false;
        
        // Переспаиваем все объекты на карте
        this.spawnEntities();
        
        // Выходим из pointer lock
        if (document.pointerLockElement === this.canvas) {
            document.exitPointerLock();
        }
        
        console.log(`✅ Респаун завершён! Врагов: ${this.enemies.length}, аптечек: ${this.loot.length}, монет: ${this.coins.length}`);
    }
    
    /**
     * Перезарядка оружия
     */
    reloadWeapon() {
        if (this.weapon.isReloading || this.weapon.ammo === this.weapon.maxAmmo) return;
        
        this.weapon.isReloading = true;
        this.weapon.reloadTimer = 300;
        this.lastReloadLoopTime = 0;
        
        this.audioManager.playReloadStartSound();
        this.renderer.activateReloadShake(1665, 4); // 1.665s = 300 frames at ~180fps
        console.log('Перезарядка...');
    }
    
    /**
     * Рестарт игры
     */
    restartGame() {
        this.player.reset();
        this.player.health = this.player.maxHealth;
        this.player.angle = 0;
        
        this.weapon.isShooting = false;
        this.weapon.shootTimer = 0;
        this.weapon.recoil = 0;
        this.weapon.ammo = this.weapon.maxAmmo;
        this.weapon.isReloading = false;
        this.weapon.reloadTimer = 0;
        
        this.isGameOver = false;
        this.gameOverTime = 0;
        this.gameOverIsWin = false;
        this.coinsCollected = 0;
        this.enemiesKilled = 0;
        
        // Сброс таймера неуязвимости при рестарте
        this.safeTimer = this.safeDuration;
        
        // Сброс таймера авторегенерации
        this.regenTimer = 0;
        this.lastDamageTime = Date.now();
        this.regenStarted = false;
        
        this.renderer.reset();
        
        this.generateLevel();
        
        console.log('Игра перезапущена!');
    }
    
    /**
     * Игра окончена
     */
    gameOver() {
        this.isGameOver = true;
        this.gameOverTime = Date.now();
        this.gameOverIsWin = false;
        
        // Остановка тряски камеры
        this.renderer.damageShake.active = false;
        this.renderer.weaponShake.active = false;
        this.renderer.damageShake.offsetX = 0;
        this.renderer.damageShake.offsetY = 0;
        this.renderer.weaponShake.offsetX = 0;
        this.renderer.weaponShake.offsetY = 0;
        
        if (document.pointerLockElement === this.canvas) {
            document.exitPointerLock();
        }
    }
    
    /**
     * Победа / Переход на следующий уровень
     */
    gameOverWin() {
        this.isGameOver = true;
        this.gameOverTime = Date.now();
        this.gameOverIsWin = true;
        
        // Остановка тряски камеры
        this.renderer.damageShake.active = false;
        this.renderer.weaponShake.active = false;
        this.renderer.damageShake.offsetX = 0;
        this.renderer.damageShake.offsetY = 0;
        this.renderer.weaponShake.offsetX = 0;
        this.renderer.weaponShake.offsetY = 0;
        
        if (document.pointerLockElement === this.canvas) {
            document.exitPointerLock();
        }
        
        if (this.currentLevel >= MAX_LEVEL) {
            console.log(`🏆 ПОЛНАЯ ПОБЕДА! Пройдено уровней: ${this.currentLevel}!`);
        } else {
            console.log(`✅ Уровень ${this.currentLevel} пройден!`);
        }
    }
    
    /**
     * Чтение данных от геймпада
     */
    updateControllerData() {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : null;
        if (!gamepads) return;
        
        // Ищем первый подключенный геймпад (обычно XInput контроллер)
        const gamepad = gamepads[0];
        
        if (gamepad) {
            if (!this.controllerData.connected && !this.controllerConnectedMessageShown) {
                console.log(`🎮 Контроллер подключен: ${gamepad.id}`);
                this.controllerConnectedMessageShown = true;
            }
            
            this.controllerData.connected = true;
            
            // Левый стик: axes[0] = X (влево-вправо), axes[1] = Y (вверх-вниз)
            this.controllerData.leftStickX = gamepad.axes[0] || 0;  // -1 (лево) .. 1 (право)
            this.controllerData.leftStickY = gamepad.axes[1] || 0;  // -1 (вверх) .. 1 (вниз)
            
            // Правый стик: axes[2] = X, axes[3] = Y
            this.controllerData.rightStickX = gamepad.axes[2] || 0;
            this.controllerData.rightStickY = gamepad.axes[3] || 0;
            
            // Кнопки геймпада (стандартная Gamepad API нумерация для XInput):
            // 0 = A, 1 = B, 2 = X, 3 = Y
            // 4 = Left Bumper (LB), 5 = Right Bumper (RB)
            // 6 = Left Trigger (LT), 7 = Right Trigger (RT)
            // 8 = Left Stick Click, 9 = Right Stick Click
            // 10 = Start, 11 = Select/Back
            
            // Но для некоторых контроллеров плечи могут быть на других индексах
            // Проверяем и LB/RB и LT/RT на разных позициях
            
            // LB (Left Bumper) - бег - проверяем кнопку 4 (стандарт) или 6 (некоторые контроллеры)
            this.controllerData.runButton = (gamepad.buttons[4]?.pressed || false) || (gamepad.buttons[6]?.pressed || false);
            
            // RT (Right Trigger) - огонь - проверяем кнопку 5 (стандарт) или 7
            const rtValue = (gamepad.buttons[5]?.value !== undefined ? gamepad.buttons[5]?.value : 0) || (gamepad.buttons[7]?.value || 0);
            const triggerPressed = rtValue > 0.5;
            
            // A (кнопка 0) - рестарт/начать
            this.controllerData.aButton = gamepad.buttons[0]?.pressed || false;
            
            // B (кнопка 1) - перезарядка
            this.controllerData.bButton = gamepad.buttons[1]?.pressed || false;
            
            // Отладочный вывод при нажатии LB (показываем каждые 500ms)
            if (this.controllerData.runButton && !this.controllerData.lastRunDebug) {
                console.log(`🎮 LB нажат: buttons[4]=${gamepad.buttons[4]?.pressed}, buttons[6]=${gamepad.buttons[6]?.pressed}`);
                console.log(`🎮 Все кнопки:`, Array.from(gamepad.buttons).map((b, i) => `${i}:${b.pressed || b.value?.toFixed(2) || 'n/a'}`).join(', '));
                this.controllerData.lastRunDebug = true;
            } else if (!this.controllerData.runButton) {
                this.controllerData.lastRunDebug = false;
            }
            
            // Обработка стрельбы от RT (только при нажатии, не при удержании)
            if (triggerPressed && !this.controllerData.lastShoot) {
                this.controllerData.triggerButton = true;
                this.shoot();
            }
            this.controllerData.lastShoot = triggerPressed;
            
            // Обработка перезарядки от B (только при нажатии)
            if (this.controllerData.bButton && !this.controllerData.lastReload) {
                this.reloadWeapon();
            }
            this.controllerData.lastReload = this.controllerData.bButton;
            
            // Обработка перехода/респауна от A (в меню Game Over)
            if (this.isGameOver && this.controllerData.aButton && !this.controllerData.lastRestart) {
                const timeSinceDeath = Date.now() - this.gameOverTime;
                if (timeSinceDeath >= GAME_OVER_DELAY) {
                    if (this.gameOverIsWin) {
                        // При победе - следующий уровень
                        this.nextLevel();
                    } else {
                        // При смерти - респаун на том же уровне
                        this.respawnPlayer();
                    }
                }
            }
            this.controllerData.lastRestart = this.controllerData.aButton;
        } else {
            this.controllerData.connected = false;
            this.controllerData.lastShoot = false;
            this.controllerData.lastReload = false;
            this.controllerData.lastRestart = false;
        }
    }
    
    /**
     * Обработка тач-контроллера
     */
    updateTouchController() {
        const touchData = this.touchController.getControllerData();
        if (!touchData.connected) {
            this.touchController.clearShootTrigger();
            return;
        }
        
        // Стрельба (только при тапе — triggerButton = true один кадр)
        if (touchData.triggerButton && !this.lastTouchShoot) {
            if (!this.isGameOver) {
                this.shoot();
            } else {
                const timeSinceDeath = Date.now() - this.gameOverTime;
                if (timeSinceDeath >= GAME_OVER_DELAY) {
                    if (this.gameOverIsWin) this.nextLevel();
                    else this.respawnPlayer();
                }
            }
        }
        this.lastTouchShoot = touchData.triggerButton;
        
        // Перезарядка (только при нажатии)
        if (touchData.bButton && !this.lastTouchReload) {
            if (!this.isGameOver) this.reloadWeapon();
        }
        this.lastTouchReload = touchData.bButton;
        
        // Сброс триггера выстрела для след. кадра
        this.touchController.clearShootTrigger();
    }

    /**
     * Обновление игры
     */
    update(deltaTime) {
        const clampedDeltaTime = Math.min(deltaTime, 100);
        
        this.updateControllerData();
        this.updateTouchController();
        
        if (this.isGameOver) return;
        
        const touchData = this.touchController.getControllerData();
        const effectiveController = touchData.connected ? touchData : this.controllerData;
        
        const movement = this.player.update(this.keys, (newX, newY) => this.checkCollision(newX, newY), clampedDeltaTime, effectiveController);
        
        // Обновление bobbing и звука шагов
        this.player.bobbing.isMoving = movement.isMoving;
        if (movement.shouldPlayFootstep) {
            this.audioManager.playFootstepSound(movement.isRunning);
        }
        
        // Обновление оружия (используем deltaTime для 180 FPS)
        if (this.weapon.isShooting) {
            const shootFrameTime = 5.56; // ~180 FPS
            this.weapon.shootTimer -= clampedDeltaTime / shootFrameTime;
            this.weapon.recoil *= 0.8;
            if (this.weapon.shootTimer <= 0) {
                this.weapon.isShooting = false;
            }
        }
        
        // Обновление перезарядки (используем deltaTime для 180 FPS)
        if (this.weapon.isReloading) {
            const reloadFrameTime = 5.56; // ~180 FPS
            this.weapon.reloadTimer -= clampedDeltaTime / reloadFrameTime;
            
            const currentTime = Date.now();
            if (currentTime - this.lastReloadLoopTime >= 500) {
                this.audioManager.playReloadLoopSound();
                this.lastReloadLoopTime = currentTime;
            }
            
            if (this.weapon.reloadTimer <= 0) {
                this.weapon.isReloading = false;
                this.weapon.ammo = this.weapon.maxAmmo;
                this.audioManager.playReloadEndSound();
                this.renderer.activateReloadFinishShake(200, 10); // 200ms burst with 10px amplitude
                console.log('Перезарядка завершена!');
            }
        }

        // Обновление таймера неуязвимости (используем deltaTime)
        if (this.safeTimer > 0) {
            this.safeTimer -= clampedDeltaTime;
            if (this.safeTimer < 0) {
                this.safeTimer = 0;
            }
            // Отладочный вывод каждые 500ms
            if (Math.floor(this.safeTimer) % 500 < 50) {
                console.log(`🛡️ Неуязвимость: ${(this.safeTimer / 1000).toFixed(1)}s`);
            }
            // Во время неуязвимости сбрасываем lastDamageTime
            this.lastDamageTime = 0;
        }
        
        // Авторегенерация здоровья по 1 HP до 3 (используем deltaTime)
        const timeSinceLastDamage = Date.now() - this.lastDamageTime;
        if (timeSinceLastDamage >= this.regenDelay) {
            // Прошло время задержки - можно регенить
            // Воспроизводим звук начала регена один раз
            if (!this.regenStarted) {
                if (this.audioManager.isInitialized() && this.player.health < 3) {
                    this.audioManager.playRegenStartSound();
                }
                this.regenTimer = this.regenInterval;
                this.regenStarted = true;
                console.log('✨ Начался автореген');
            }
            this.regenTimer += clampedDeltaTime;
            if (this.regenTimer >= this.regenInterval) {
                this.regenTimer = 0;
                if (this.player.health < 3) {
                    this.player.health++;
                    console.log(`❤️ Автореген: ${this.player.health} HP`);
                }
            }
        }
        else {
            this.regenTimer = 0;
            this.regenStarted = false; // сбрасываем флаг при получении урона
        }
        
        // Обновление таймера триггера звука (ИИ)
        if (this.soundTriggerTimer > 0) {
            this.soundTriggerTimer -= deltaTime;
            if (this.soundTriggerTimer <= 0) {
                this.soundTrigger = null;
            }
        }
        
        // Обновление врагов (с учётом deltaTime для 180 FPS)
        const frameTime = 5.56; // ~180 FPS
        
        // Обновление ИИ врагов
        for (let enemy of this.enemies) {
            if (enemy.isDead) continue;
            enemy.updateAI(deltaTime, this);
        }
        
        // Проверка на NaN для отладки
        if (!Number.isFinite(this.safeTimer)) {
            // console.error(`🛡️ ERROR: safeTimer is ${this.safeTimer} (type: ${typeof this.safeTimer})`);
        }
        // console.log(`🛡️ safeTimer: ${typeof this.safeTimer === 'number' ? this.safeTimer.toFixed(0) : 'NaN/undefined'}ms, enemies count: ${this.enemies.length}, deltaTime: ${deltaTime}`);
        for (let enemy of this.enemies) {
            if (enemy.isDead) continue;
            
            const dx = this.player.x - enemy.x;
            const dy = this.player.y - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const shootT = typeof enemy.shootTimer === 'number' ? enemy.shootTimer.toFixed(0) : 'NaN/undefined';
            const aimT = typeof enemy.aimingTimer === 'number' ? enemy.aimingTimer.toFixed(0) : 'NaN/undefined';
            // console.log(`👾 Враг: dist=${parseFloat(dist.toFixed(0))}, sshootTimer=${shootT}, aimingTimer=${aimT}, isAiming=${enemy.isAiming}`);
            
            // Эффект попадания (используем deltaTime)
            if (enemy.isHit) {
                enemy.hitTimer -= clampedDeltaTime / frameTime;
                if (enemy.hitTimer <= 0) {
                    enemy.isHit = false;
                }
            }
            
            // Таймер стрельбы врага (используем deltaTime)
            enemy.shootTimer -= clampedDeltaTime / frameTime;
            
            const angleToPlayer = Math.atan2(dy, dx);
            let angleDiff = angleToPlayer - enemy.angle;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            
            const turnSpeed = 0.1;
            if (Math.abs(angleDiff) < Math.PI) {
                enemy.angle += Math.sign(angleDiff) * Math.min(turnSpeed, Math.abs(angleDiff));
            }
            
            const canSeePlayer = enemy.shootTimer <= 0 && Math.abs(angleDiff) < 1.0 && dist < 1400 && !this.isWallBetween(enemy.x, enemy.y, this.player.x, this.player.y);
            
            if (canSeePlayer) {
                if (!enemy.isAiming) {
                    enemy.isAiming = true;
                    enemy.aimingTimer = enemy.aimingDelay;
                }
                
                // Таймер прицеливания (используем deltaTime)
                enemy.aimingTimer -= clampedDeltaTime / frameTime;
                
                if (enemy.aimingTimer <= 0) {
                    // Проверяем неуязвимость игрока
                    if (this.safeTimer > 0) {
                        // Игрок неуязвим - пропускаем выстрел, но сбрасываем таймеры врага
                        console.log(`⚡ Враг выстрелил, но игрок неуязвим! Осталось: ${(this.safeTimer / 1000).toFixed(1)}s`);
                        enemy.shootTimer = enemy.shootInterval;
                        enemy.isAiming = false;
                        enemy.aimingTimer = 0;
                    } else {
                        this.audioManager.playEnemyShootSound();
                        this.player.health--;
                        this.lastDamageTime = Date.now(); // Сброс таймера регена при получении урона
                        
                        // Триггер звука для ИИ врагов (выстрел врага тоже слышен)
                        this.soundTrigger = { x: enemy.x, y: enemy.y };
                        this.soundTriggerTimer = 2000;
                        this.audioManager.playDamageSound();
                        
                        const angleToEnemy = Math.atan2(-dy, -dx);
                        this.renderer.activateHitVignette();
                        this.renderer.activateDirectionalVignette(angleToEnemy);
                        
                        // Активация виньетки низкого здоровья
                        if (this.player.health <= this.renderer.vignette.lowHealth.minHealthThreshold) {
                            this.renderer.activateLowHealthVignette(Math.max(0, 1 - this.player.health / this.renderer.vignette.lowHealth.minHealthThreshold));
                        }
                        
                        // Активация тряски камеры при получении урона
                        // Смещение камеры происходит в сторону противоположной источнику урона
                        this.renderer.activateDamageShake(500, 35, angleToEnemy);
                        
                        enemy.shootTimer = enemy.shootInterval;
                        enemy.isAiming = false;
                        enemy.aimingTimer = 0;
                    }
                }
            } else {
                enemy.isAiming = false;
                enemy.aimingTimer = 0;
            }
        }
        
        // Сбор лута
        for (let i = this.loot.length - 1; i >= 0; i--) {
            const item = this.loot[i];
            const dist = Math.sqrt((this.player.x - item.x) ** 2 + (this.player.y - item.y) ** 2);
            if (dist < this.player.radius + item.radius) {
                this.player.health = Math.min(this.player.maxHealth, this.player.health + item.value);
                this.audioManager.playPickupSound();
                this.loot.splice(i, 1);
            }
        }
        
        // Сбор монет
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i];
            const dist = Math.sqrt((this.player.x - coin.x) ** 2 + (this.player.y - coin.y) ** 2);
            if (dist < this.player.radius + coin.radius) {
                this.coinsCollected += coin.value;
                this.audioManager.playCoinPickupSound();
                this.coins.splice(i, 1);
                
                if (this.coins.length === 0) {
                    this.gameOverWin();
                }
            }
        }
        
        // Проверка смерти игрока
        if (this.player.health <= 0 && !this.isGameOver) {
            this.gameOver();
        }
    }
    
    /**
     * Переход на следующий уровень
     */
    nextLevel() {
        this.currentLevel++;
        
        // СБРОС СОСТОЯНИЯ GAME OVER - это КРИТИЧНО важно!
        this.isGameOver = false;
        this.gameOverTime = 0;
        this.gameOverIsWin = false;
        
        // Сброс состояний
        this.coinsCollected = 0;
        this.enemiesKilled = 0;
        
        // Полная пересетка игрока
        this.player.reset();
        this.player.health = this.player.maxHealth;
        this.player.angle = 0;
        
        // Сброс оружия
        this.weapon.isShooting = false;
        this.weapon.shootTimer = 0;
        this.weapon.recoil = 0;
        this.weapon.ammo = this.weapon.maxAmmo;
        this.weapon.isReloading = false;
        this.weapon.reloadTimer = 0;
        
        // Сброс таймеров
        this.safeTimer = this.safeDuration;
        this.regenTimer = 0;
        this.lastDamageTime = Date.now();
        this.regenStarted = false;
        
        this.renderer.reset();
        
        // Выход из pointer lock если он активен
        if (document.pointerLockElement === this.canvas) {
            document.exitPointerLock();
        }
        
        // Генерация нового уровня
        this.generateLevel();
        
        console.log(`➡️ Переход на уровень ${this.currentLevel}...`);
    }
    
    /**
     * Рестарт игры
     */
    restartGame() {
        this.currentLevel = 1;
        
        this.player.reset();
        this.player.health = this.player.maxHealth;
        this.player.angle = 0;
        
        this.weapon.isShooting = false;
        this.weapon.shootTimer = 0;
        this.weapon.recoil = 0;
        this.weapon.ammo = this.weapon.maxAmmo;
        this.weapon.isReloading = false;
        this.weapon.reloadTimer = 0;
        
        this.isGameOver = false;
        this.gameOverTime = 0;
        this.gameOverIsWin = false;
        this.coinsCollected = 0;
        this.enemiesKilled = 0;
        
        // Сброс таймера неуязвимости при рестарте
        this.safeTimer = this.safeDuration;
        
        // Сброс таймера авторегенерации
        this.regenTimer = 0;
        this.lastDamageTime = Date.now();
        this.regenStarted = false;
        
        this.renderer.reset();
        this.touchController.reset();
        
        this.generateLevel();
        
        console.log('Игра перезапущена!');
    }
    
    /**
     * Игровой цикл
     */
    gameLoop(timestamp) {
        // Вычисление deltaTime в миллисекундах
        if (this.lastTime) {
            this.deltaTime = timestamp - this.lastTime;
        } else {
            this.deltaTime = 16.67; // Дефолтное значение ~60 FPS
        }
        this.lastTime = timestamp;
        
        // Ограничение deltaTime максимум 100мс
        const clampedDeltaTime = Math.min(this.deltaTime, 100);
        
        // Обновление игры
        this.update(clampedDeltaTime);
        
        // Отрисовка
        this.render();
        
        // Запрос следующего кадра
        requestAnimationFrame((ts) => this.gameLoop(ts));
    }
    
    /**
     * Отрисовка текущего кадра
     */
    render() {
        this.renderer.render(
            this.canvas, this.ctx, this.width, this.height, this.keys, this.player, this.weapon,
            this.MAP, TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, this.enemies, this.loot, this.coins,
            this.coinsCollected, 0, this.player.health, this.isGameOver, this.gameOverTime, this.gameOverIsWin, this.enemiesKilled, this.currentLevel
        );
        
        // Отрисовка тач-контроллера (джойстики и кнопки поверх игры)
        this.touchController.render(this.ctx, this.width, this.height);
    }
    
    /**
     * Запуск игры
     */
    start() {
        this.resizeCanvas();
        this.generateLevel();
        this.lastTime = 0;
        this.deltaTime = 16.67;
        requestAnimationFrame((ts) => this.gameLoop(ts));
        console.log('Игра инициализирована!');
    }
}
