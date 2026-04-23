/**
 * Класс для тач-управления с двумя виртуальными джойстиками
 * Левый джойстик — движение (вперёд/назад, стрейф)
 * Правый джойстик — вращение камеры
 * Кнопки — стрельба, перезарядка, бег
 */
export class TouchController {
    constructor(canvas) {
        this.canvas = canvas;
        
        // Состояние джойстиков
        this.leftStick = {
            active: false,
            touchId: null,
            baseX: 0,      // Базовая позиция центра джойстика (где был первый тач)
            baseY: 0,
            currentX: 0,   // Текущая позиция пальца
            currentY: 0,
            normX: 0,      // Нормализованное значение X: [-1, 1]
            normY: 0       // Нормализованное значение Y: [-1, 1]
        };
        
        this.rightStick = {
            active: false,
            touchId: null,
            baseX: 0,
            baseY: 0,
            currentX: 0,
            currentY: 0,
            normX: 0,
            normY: 0
        };
        
        // Кнопки
        this.buttons = {
            shoot: false,
            reload: false,
            run: false
        };
        
        // Для отслеживания single tap (для стрельбы при одиночном касании справа)
        this.lastTapTime = 0;
        this.lastTapX = 0;
        this.lastTapY = 0;
        
        // Радиус джойстика
        this.stickRadius = 60;      // Максимальный радиус движения джойстика
        this.stickVisualRadius = 50; // Визуальный радиус основы джойстика
        this.knobVisualRadius = 25;  // Визуальный радиус "грибка" джойстика
        
        // Позиции кнопок (вычисляются при resize)
        this.buttonPositions = {};
        
        // Флаг: тач-устройство или нет
        this.isTouchDevice = false;
        
        // Отладка
        this.debug = false;
        
        // Настройка событий
        this.setupEventListeners();
    }
    
    /**
     * Настройка слушателей тач-событий
     */
    setupEventListeners() {
        const canvas = this.canvas;
        
        // Touch events — используем passive: false чтобы preventDefault работал
        canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        canvas.addEventListener('touchcancel', (e) => this.handleTouchCancel(e), { passive: false });
        
        // Проверяем, тач-устройство ли это
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            this.isTouchDevice = true;
        }
        
        // Обработка ресайза для пересчёта позиций кнопок
        window.addEventListener('resize', () => this.updateButtonPositions());
        
        // Начальные позиции кнопок
        this.updateButtonPositions();
    }
    
    /**
     * Обновляет позиции кнопок при изменении размера экрана
     */
    updateButtonPositions() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        // Кнопка стрельбы — справа внизу, чуть выше перезарядки
        this.buttonPositions.shoot = {
            x: w - 80,
            y: h - 80,
            radius: 35
        };
        
        // Кнопка перезарядки — справа внизу, ниже стрельбы
        this.buttonPositions.reload = {
            x: w - 150,
            y: h - 120,
            radius: 28
        };
        
        // Кнопка бега — слева внизу, рядом с левым джойстиком
        this.buttonPositions.run = {
            x: 100,
            y: h - 80,
            radius: 25
        };
    }
    
    /**
     * Определяет, находится ли точка в зоне кнопки
     */
    isInsideButton(x, y, buttonName) {
        const btn = this.buttonPositions[buttonName];
        if (!btn) return false;
        const dx = x - btn.x;
        const dy = y - btn.y;
        return dx * dx + dy * dy <= btn.radius * btn.radius;
    }
    
    /**
     * Определяет, в какой половине экрана произошло касание
     */
    getScreenHalf(x) {
        return x < this.canvas.width / 2 ? 'left' : 'right';
    }
    
    /**
     * Обработка touchstart
     */
    handleTouchStart(e) {
        e.preventDefault();
        this.isTouchDevice = true;
        
        const touches = Array.from(e.changedTouches);
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        for (const touch of touches) {
            const x = touch.clientX;
            const y = touch.clientY;
            
            // Проверяем, не нажата ли кнопка
            if (this.isInsideButton(x, y, 'shoot')) {
                this.buttons.shoot = true;
                // Сохраняем как отдельный тач для кнопки
                touch._buttonType = 'shoot';
                continue;
            }
            
            if (this.isInsideButton(x, y, 'reload')) {
                this.buttons.reload = true;
                touch._buttonType = 'reload';
                continue;
            }
            
            if (this.isInsideButton(x, y, 'run')) {
                this.buttons.run = true;
                touch._buttonType = 'run';
                continue;
            }
            
            // Проверяем, какой джойстик активировать
            const half = this.getScreenHalf(x);
            
            if (half === 'left' && !this.leftStick.active) {
                // Активируем левый джойстик (движение)
                this.leftStick.active = true;
                this.leftStick.touchId = touch.identifier;
                this.leftStick.baseX = x;
                this.leftStick.baseY = y;
                this.leftStick.currentX = x;
                this.leftStick.currentY = y;
                this.leftStick.normX = 0;
                this.leftStick.normY = 0;
            } else if (half === 'right' && !this.rightStick.active) {
                // Активируем правый джойстик (камера)
                this.rightStick.active = true;
                this.rightStick.touchId = touch.identifier;
                this.rightStick.baseX = x;
                this.rightStick.baseY = y;
                this.rightStick.currentX = x;
                this.rightStick.currentY = y;
                this.rightStick.normX = 0;
                this.rightStick.normY = 0;
            }
        }
    }
    
    /**
     * Обработка touchmove
     */
    handleTouchMove(e) {
        e.preventDefault();
        
        const touches = Array.from(e.changedTouches);
        
        for (const touch of touches) {
            const x = touch.clientX;
            const y = touch.clientY;
            
            // Если это тач кнопки — игнорируем движение
            if (touch._buttonType) continue;
            
            // Проверяем, принадлежит ли этот тач левому джойстику
            if (this.leftStick.active && this.leftStick.touchId === touch.identifier) {
                this.leftStick.currentX = x;
                this.leftStick.currentY = y;
                
                // Вычисляем смещение от базы
                let dx = x - this.leftStick.baseX;
                let dy = y - this.leftStick.baseY;
                
                // Ограничиваем радиус джойстика
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance > this.stickRadius) {
                    const scale = this.stickRadius / distance;
                    dx *= scale;
                    dy *= scale;
                }
                
                // Нормализуем значения к [-1, 1]
                this.leftStick.normX = dx / this.stickRadius;
                this.leftStick.normY = dy / this.stickRadius;
                
                if (this.debug) {
                    console.log(`Левый: x=${this.leftStick.normX.toFixed(2)}, y=${this.leftStick.normY.toFixed(2)}`);
                }
            }
            
            // Проверяем, appartient ли этот тач правому джойстику
            if (this.rightStick.active && this.rightStick.touchId === touch.identifier) {
                this.rightStick.currentX = x;
                this.rightStick.currentY = y;
                
                // Вычисляем смещение от базы
                let dx = x - this.rightStick.baseX;
                let dy = y - this.rightStick.baseY;
                
                // Ограничиваем радиус джойстика
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance > this.stickRadius) {
                    const scale = this.stickRadius / distance;
                    dx *= scale;
                    dy *= scale;
                }
                
                // Нормализуем значения к [-1, 1]
                this.rightStick.normX = dx / this.stickRadius;
                this.rightStick.normY = dy / this.stickRadius;
                
                if (this.debug) {
                    console.log(`Правый: x=${this.rightStick.normX.toFixed(2)}, y=${this.rightStick.normY.toFixed(2)}`);
                }
            }
        }
    }
    
    /**
     * Обработка touchend
     */
    handleTouchEnd(e) {
        e.preventDefault();
        
        const touches = Array.from(e.changedTouches);
        
        for (const touch of touches) {
            // Если это был тач кнопки
            if (touch._buttonType === 'shoot') {
                this.buttons.shoot = false;
            } else if (touch._buttonType === 'reload') {
                this.buttons.reload = false;
            } else if (touch._buttonType === 'run') {
                this.buttons.run = false;
            }
            
            // Проверяем, заканчивается ли левый джойстик
            if (this.leftStick.active && this.leftStick.touchId === touch.identifier) {
                this.leftStick.active = false;
                this.leftStick.touchId = null;
                this.leftStick.normX = 0;
                this.leftStick.normY = 0;
            }
            
            // Проверяем, заканчивается ли правый джойстик
            if (this.rightStick.active && this.rightStick.touchId === touch.identifier) {
                this.rightStick.active = false;
                this.rightStick.touchId = null;
                this.rightStick.normX = 0;
                this.rightStick.normY = 0;
            }
        }
    }
    
    /**
     * Обработка touchcancel
     */
    handleTouchCancel(e) {
        e.preventDefault();
        // Сбрасываем всё
        this.leftStick.active = false;
        this.leftStick.touchId = null;
        this.leftStick.normX = 0;
        this.leftStick.normY = 0;
        
        this.rightStick.active = false;
        this.rightStick.touchId = null;
        this.rightStick.normX = 0;
        this.rightStick.normY = 0;
        
        this.buttons.shoot = false;
        this.buttons.reload = false;
        this.buttons.run = false;
    }
    
    /**
     * Возвращает данные контроллера в формате, совместимом с gamepad
     * Используется в Player.update()
     */
    getControllerData() {
        const deadZone = 0.1;
        
        // Применяем дедзону
        let leftX = this.leftStick.normX;
        let leftY = this.leftStick.normY;
        
        if (Math.abs(leftX) < deadZone) leftX = 0;
        else if (leftX > 0) leftX = (leftX - deadZone) / (1 - deadZone);
        else leftX = (leftX + deadZone) / (1 - deadZone);
        
        if (Math.abs(leftY) < deadZone) leftY = 0;
        else if (leftY > 0) leftY = (leftY - deadZone) / (1 - deadZone);
        else leftY = (leftY + deadZone) / (1 - deadZone);
        
        return {
            connected: this.isTouchDevice,
            leftStickX: leftX,
            leftStickY: leftY,
            rightStickX: this.rightStick.normX,
            rightStickY: this.rightStick.normY,
            runButton: this.buttons.run,
            triggerButton: this.buttons.shoot,
            aButton: false,
            bButton: false
        };
    }
    
    /**
     * Проверяем, нужно ли выполнить действие (для одноразовых нажатий)
     */
    wasButtonJustPressed(currentState, lastState) {
        return currentState && !lastState;
    }
    
    /**
     * Отрисовка виртуальных джойстиков и кнопок на канвасе
     */
    render(ctx, width, height) {
        // Отрисовываем только если джойстик активен или устройство тачевое
        if (!this.isTouchDevice) return;
        
        // Левый джойстик (движение)
        if (this.leftStick.active) {
            this.drawJoystick(ctx, this.leftStick.baseX, this.leftStick.baseY, 
                           this.leftStick.normX, this.leftStick.normY);
        } else {
            // Рисуем полупрозрачный подсказочный круг слева внизу
            this.drawJoystickHint(ctx, width * 0.15, height - 120);
        }
        
        // Правый джойстик (камера)
        if (this.rightStick.active) {
            this.drawJoystick(ctx, this.rightStick.baseX, this.rightStick.baseY, 
                           this.rightStick.normX, this.rightStick.normY);
        } else {
            // Рисуем полупрозрачный подсказочный круг справа
            this.drawJoystickHint(ctx, width * 0.85, height - 120);
        }
        
        // Отрисовка кнопок
        this.drawButton(ctx, this.buttonPositions.shoot, this.buttons.shoot, '🔫', '#ff4444');
        this.drawButton(ctx, this.buttonPositions.reload, this.buttons.reload, '🔄', '#4488ff');
        this.drawButton(ctx, this.buttonPositions.run, this.buttons.run, '⚡', '#ffaa00');
    }
    
    /**
     * Отрисовка джойстика
     */
    drawJoystick(ctx, baseX, baseY, normX, normY) {
        // Основа джойстика
        ctx.save();
        ctx.beginPath();
        ctx.arc(baseX, baseY, this.stickVisualRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // "Грибок" джойстика
        const knobX = baseX + normX * this.stickRadius;
        const knobY = baseY + normY * this.stickRadius;
        
        ctx.beginPath();
        ctx.arc(knobX, knobY, this.knobVisualRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.restore();
    }
    
    /**
     * Отрисовка подсказки где находится джойстик
     */
    drawJoystickHint(ctx, x, y) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, this.stickVisualRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.restore();
    }
    
    /**
     * Отрисовка кнопки
     */
    drawButton(ctx, position, isActive, icon, color) {
        if (!position) return;
        
        ctx.save();
        
        // Основа кнопки
        ctx.beginPath();
        ctx.arc(position.x, position.y, position.radius, 0, Math.PI * 2);
        
        if (isActive) {
            ctx.fillStyle = `${color}88`; // Прозрачность при нажатии
            ctx.strokeStyle = `${color}cc`;
        } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        }
        
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Иконка кнопки
        ctx.font = `${position.radius}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(icon, position.x, position.y + 2);
        
        ctx.restore();
    }
    
    /**
     * Сброс состояния (например, при рестарте игры)
     */
    reset() {
        this.leftStick.active = false;
        this.leftStick.touchId = null;
        this.leftStick.normX = 0;
        this.leftStick.normY = 0;
        
        this.rightStick.active = false;
        this.rightStick.touchId = null;
        this.rightStick.normX = 0;
        this.rightStick.normY = 0;
        
        this.buttons.shoot = false;
        this.buttons.reload = false;
        this.buttons.run = false;
    }
}