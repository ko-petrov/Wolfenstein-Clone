/**
 * Класс для управления врагами с ИИ
 */
export class Enemy {
    constructor(x, y, enemyType = 'normal') {
        this.x = x;
        this.y = y;
        this.radius = 25;
        this.height = 50;
        this.health = Math.floor(Math.random() * 3) + 4;
        this.isHit = false;
        this.hitTimer = 0;
        this.isDead = false;
        this.shootTimer = 240 + Math.floor(Math.random() * 120);
        this.shootInterval = 180 + Math.floor(Math.random() * 120);
        this.angle = 0;
        this.aimingTimer = 90 + Math.floor(Math.random() * 60);
        this.aimingDelay = 90 + Math.floor(Math.random() * 60);
        this.isAiming = false;
        
        // Параметры ИИ
        this.enemyType = enemyType; // 'normal', 'coward', 'assault'
        this.speed = this.getSpeedByType();
        this.state = 'idle'; // 'idle', 'moving', 'retreating'
        this.moveAngle = 0;
        this.stateTimer = 0;
        this.hearingRange = 600; // радиус слышимости в пикселях
        
        // Для плавного движения
        this.destinationX = x;
        this.destinationY = y;
        this.reachedDestination = true;
    }
    
    getSpeedByType() {
        switch (this.enemyType) {
            case 'normal':
                return 50; // пикселей в секунду
            case 'coward':
                return 40;
            case 'assault':
                return 80; // быстрый штурмовик
            default:
                return 50;
        }
    }
    
    takeDamage(damageX, damageY) {
        this.health--;
        this.isHit = true;
        this.hitTimer = 10;
        
        // Трусливые враги отступают при получении урона
        if (this.enemyType === 'coward' && this.health > 0) {
            this.state = 'retreating';
            this.stateTimer = 300; // отступают на 300 кадров (~5 сек при 60fps)
            this.reachedDestination = false;
        }
        
        if (this.health <= 0) {
            this.isDead = true;
            return true;
        }
        return false;
    }
    
    /**
     * Обновление ИИ врага
     */
    updateAI(deltaTime, gameRef) {
        if (this.isDead) return;
        
        // Обновление таймера состояния (для отступа)
        if (this.state === 'retreating') {
            this.stateTimer -= deltaTime;
            if (this.stateTimer <= 0) {
                this.state = 'idle';
                this.reachedDestination = false;
            }
        }
        
        // Если уже движемся к цели, продолжаем движение
        if (!this.reachedDestination && this.state !== 'idle') {
            this.move(deltaTime, gameRef);
            return;
        }
        
        // Обработка звука стрельбы
        if (gameRef.soundTrigger) {
            const distToSound = Math.sqrt(
                (gameRef.soundTrigger.x - this.x) ** 2 + 
                (gameRef.soundTrigger.y - this.y) ** 2
            );
            
            if (distToSound <= this.hearingRange) {
                // Враг услышал выстрел
                if (this.enemyType === 'assault') {
                    // Штурмовики бегут к игроку (источнику звука)
                    this.destinationX = gameRef.player.x;
                    this.destinationY = gameRef.player.y;
                    this.state = 'moving';
                    this.reachedDestination = false;
                } else if (this.enemyType === 'normal') {
                    // Обычные идут к источнику звука проверять
                    this.destinationX = gameRef.soundTrigger.x;
                    this.destinationY = gameRef.soundTrigger.y;
                    this.state = 'moving';
                    this.reachedDestination = false;
                } else if (this.enemyType === 'coward') {
                    // Трусливые убегают от источника звука
                    this.cowardFleeFrom(gameRef.soundTrigger.x, gameRef.soundTrigger.y, gameRef);
                }
            }
        }
    }
    
    /**
     * Трусливый враг убегает от точки в противоположную сторону
     */
    cowardFleeFrom(fleeX, fleeY, gameRef) {
        // Вычисляем направление от точки отпугивания
        const dx = this.x - fleeX;
        const dy = this.y - fleeY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
            // Находим точку в противоположном направлении
            this.destinationX = this.x + (dx / dist) * 150;
            this.destinationY = this.y + (dy / dist) * 150;
            this.state = 'retreating';
            this.stateTimer = 200;
            this.reachedDestination = false;
        }
    }
    
    /**
     * Проверка свободна ли позиция от стен с учётом радиуса врага
     */
    isPositionClear(x, y, map, TILE_SIZE = 64) {
        const r = this.radius; // радиус врага (25 пикселей)
        
        // Проверяем 4 точки вокруг врага с отступом на радиус
        const points = [
            { dx: r, dy: r },
            { dx: -r, dy: r },
            { dx: r, dy: -r },
            { dx: -r, dy: -r }
        ];
        
        for (const p of points) {
            const checkX = Math.floor((x + p.dx) / TILE_SIZE);
            const checkY = Math.floor((y + p.dy) / TILE_SIZE);
            
            if (checkY < 0 || checkY >= map.length || checkX < 0 || checkX >= map[0].length) {
                return false;
            }
            
            if (map[checkY][checkX] === 1) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * Плавное движение к цели с обходом стен
     */
    move(deltaTime, gameRef) {
        const dx = this.destinationX - this.x;
        const dy = this.destinationY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Если дошли до цели
        if (dist < 10) {
            this.reachedDestination = true;
            this.state = 'idle';
            return;
        }
        
        // Вычисляем угол движения
        this.moveAngle = Math.atan2(dy, dx);
        
        // Вычисляем расстояние для движения за этот кадр
        const moveSpeed = this.speed * (deltaTime / 1000);
        
        // Проверяем коллизию со стенами с учётом радиуса врага
        const newX = this.x + (dx / dist) * moveSpeed;
        const newY = this.y + (dy / dist) * moveSpeed;
        
        if (this.isPositionClear(newX, newY, gameRef.MAP)) {
            this.x = newX;
            this.y = newY;
        } else {
            // Если прямо в стену — пробую скользнуть вдоль walls
            this.trySlidingMove(deltaTime, gameRef, dx, dy);
        }
    }
    
    /**
     * Попытка скользящего движения вдоль стен
     */
    trySlidingMove(deltaTime, gameRef, dx, dy) {
        const moveSpeed = this.speed * (deltaTime / 1000);
        
        // Пробую двигаться только по X
        const newX = this.x + Math.sign(dx) * moveSpeed;
        if (this.isPositionClear(newX, this.y, gameRef.MAP)) {
            this.x = newX;
            return;
        }
        
        // Пробую двигаться только по Y
        const newY = this.y + Math.sign(dy) * moveSpeed;
        if (this.isPositionClear(this.x, newY, gameRef.MAP)) {
            this.y = newY;
        }
    }
    
    /**
     * Получить тип врага
     */
    getType() {
        return this.enemyType;
    }
    
    /**
     * Создать нового врага указанного типа
     */
    static createRandom(x, y) {
        const types = ['normal', 'normal', 'normal', 'coward', 'assault'];
        const type = types[Math.floor(Math.random() * types.length)];
        return new Enemy(x, y, type);
    }
}

export function createEnemy(x, y, type = 'normal') {
    return new Enemy(x, y, type);
}