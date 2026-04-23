/**
 * Класс для управления игроком
 */
export class Player {
    constructor() {
        this.x = 100;
        this.y = 100;
        this.angle = 0;
        this.fov = Math.PI / 3; // 60 градусов
        this.walkSpeed = 0.5;   // Скорость обычной ходьбы
        this.runSpeed = 1.0;    // Скорость бега (при удержании Shift)
        this.rotSpeed = 0.013;
        this.mouseSensitivity = 0.002; // Чувствительность мыши для поворота камеры
        this.radius = 15; // Радиус игрока для коллизий
        this.health = 10; // Текущее здоровье
        this.maxHealth = 10; // Максимальное здоровье
        // Эффект покачивания головы (Bobbing) при движении
        this.bobbing = {
            phase: 0,           // Текущая фаза синусоиды для вертикального движения
            isMoving: false     // Флаг движения игрока
        };
        // Плавное ускорение/замедление движения
        this.forwardSpeed = 0;        // Текущая скорость движения вперед/назад
        this.strafeSpeed = 0;         // Текущая скорость бокового движения
        this.acceleration = 0.07;    // Коэффициент ускорения, нормализован для delta time
    }
    
    /**
     * Сброс состояния игрока
     */
    reset() {
        this.health = this.maxHealth;
        this.angle = 0;
        this.forwardSpeed = 0;
        this.strafeSpeed = 0;
        this.bobbing.phase = 0;
        this.bobbing.isMoving = false;
    }
    
    /**
     * Обновление позиции игрока на основе нажатых клавиш
     * @param {Object} keys - Объект с нажатыми клавишами
     * @param {Function} checkCollision - Функция проверки коллизий
     * @param {number} deltaTime - Время с прошлого кадра в миллисекундах
     * @param {Object} controllerData - Данные от контроллера (опционально)
     * @returns {boolean} true если игрок двигается
     */
    update(keys, checkCollision, deltaTime = 5.56, controllerData = null) {
        let nextX = this.x;
        let nextY = this.y;

        // Нормализуем deltaTime к базовым 180 FPS (5.56ms)
        const deltaRatio = deltaTime / 5.56;
        const maxDeltaRatio = 6; // Ограничиваем максимум 6-кратным скачком
        const clampedDeltaRatio = Math.min(deltaRatio, maxDeltaRatio);
        
        // Дедзона для стиков контроллера
        const stickDeadZone = 0.1;
        
        // Определяем целевую скорость движения
        let isRunning = keys['ShiftLeft'] || keys['ShiftRight'] || controllerData.runButton;
        let forwardSpeed = isRunning ? this.runSpeed : this.walkSpeed;
        let backwardSpeed = this.walkSpeed; // Движение назад
        let strafeSpeed = this.walkSpeed * 0.85 // 0.75; // Скорость стрейфа
        
        // Вычисляем целевые скорости для forward/backward и strafe отдельно
        let targetForwardSpeed = 0;
        let targetStrafeSpeed = 0;
        
        // Клавиатурное управление (работает всегда)
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
        
        // Поворот камеры (стрелки влево/вправо)
        if (keys['ArrowLeft']) {
            this.angle -= this.rotSpeed;
        }
        if (keys['ArrowRight']) {
            this.angle += this.rotSpeed;
        }
        
        // Управление контроллером (добавляется к клавиатуре или заменяет её)
        if (controllerData && controllerData.connected) {
            // Движение от левого стика
            const leftStickX = controllerData.leftStickX;
            const leftStickY = controllerData.leftStickY;
            
            // Проверяем дедзону
            if (Math.abs(leftStickY) > stickDeadZone) {
                targetForwardSpeed = -leftStickY * forwardSpeed;
            }
            if (Math.abs(leftStickX) > stickDeadZone) {
                // Инвертируем X для правильного стрейфа: левый стик влево = стрейф влево
                targetStrafeSpeed = -leftStickX * strafeSpeed;
            }
            
            // Проверяем бег от LB
            if (controllerData.runButton) {
                isRunning = true;
                forwardSpeed = this.runSpeed;
            }
            
            // Вращение камеры от правого стика / тач-дельты
            const rightStickX = controllerData.rightStickX;
            if (Math.abs(rightStickX) > stickDeadZone) {
                // Геймпад: нормализованное значение [-1, 1]
                this.angle += rightStickX * this.rotSpeed * 3;
            } else if (Math.abs(rightStickX) > 0) {
                // Тач-контроллер: дельта в пикселях
                // Используем собственную чувствительность (не mouseSensitivity)
                const sensitivity = controllerData.touchRotateSensitivity || 0.004;
                this.angle += rightStickX * sensitivity;
            }
        }
        
        // Плавное ускорение/замедление для forward/backward компоненты (с учётом delta time)
        this.forwardSpeed = this.forwardSpeed + (targetForwardSpeed - this.forwardSpeed) * this.acceleration * clampedDeltaRatio;
        
        // Плавное ускорение/замедление для strafe компоненты (с учётом delta time)
        this.strafeSpeed = this.strafeSpeed + (targetStrafeSpeed - this.strafeSpeed) * this.acceleration * clampedDeltaRatio;
        
        // Вычисляем итоговое смещение на основе текущих скоростей (с учётом deltaTime)
        if (this.forwardSpeed !== 0) {
            nextX += Math.cos(this.angle) * this.forwardSpeed * clampedDeltaRatio;
            nextY += Math.sin(this.angle) * this.forwardSpeed * clampedDeltaRatio;
        }
        
        if (this.strafeSpeed !== 0) {
            nextX += Math.cos(this.angle - Math.PI / 2) * this.strafeSpeed * clampedDeltaRatio;
            nextY += Math.sin(this.angle - Math.PI / 2) * this.strafeSpeed * clampedDeltaRatio;
        }

        if (!checkCollision(nextX, nextY)) {
            this.x = nextX;
            this.y = nextY;
        } else {
            const checkXOnly = !checkCollision(nextX, this.y);
            const checkYOnly = !checkCollision(this.x, nextY);

            if (checkXOnly) {
                this.x = nextX;
            }
            if (checkYOnly) {
                this.y = nextY;
            }
        }

        // Обновление эффекта покачивания головы (Bobbing) при движении
        // Вычисляем реальную скорость как векторную сумму (теорема Пифагора)
        const totalSpeed = Math.sqrt(
            this.forwardSpeed * this.forwardSpeed +
            this.strafeSpeed * this.strafeSpeed
        );
        const isMoving = totalSpeed > 0.01; // Движение считается активным, если скорость выше порога
        this.bobbing.isMoving = isMoving;
        
        if (isMoving) {
            // Скорость покачивания зависит от текущей скорости (с учётом deltaTime)
            const maxBobbingSpeed = 0.08; // Максимальная скорость покачивания
            // Определяем текущую максимальную скорость (зависит от нажатого Shift)
            const currentMaxSpeed = isRunning ? this.runSpeed : this.walkSpeed;
            const speedRatio = totalSpeed / currentMaxSpeed;
            const bobbingSpeed = maxBobbingSpeed * speedRatio * clampedDeltaRatio;
            
            // Сохраняем фазу до обновления для проверки шага
            const previousPhase = this.bobbing.phase;
            this.bobbing.phase += bobbingSpeed;
            
            // Возвращаем информацию о шаге для воспроизведения звука
            const bobValue = Math.sin(previousPhase);
            const newBobValue = Math.sin(this.bobbing.phase);
            
            return {
                isMoving: true,
                shouldPlayFootstep: bobValue >= -0.5 && newBobValue < -0.5 && speedRatio > 0.8,
                isRunning: speedRatio > 0.8
            };
        }
        
        return { isMoving: false, shouldPlayFootstep: false, isRunning: false };
    }
    
    /**
     * Поворот камеры мышью
     * @param {number} movementX - Смещение мыши по X
     */
    rotateCamera(movementX) {
        this.angle += movementX * this.mouseSensitivity;
        // Нормализация угла в диапазоне [0, 2*PI]
        if (this.angle < 0) this.angle += Math.PI * 2;
        if (this.angle >= Math.PI * 2) this.angle -= Math.PI * 2;
    }
}
