/**
 * Тач-управление с двумя зонами:
 * - Левая половина: джойстик движения (сильный наклон = бег)
 * - Правая половина: тап = выстрел, удержание+движение = камера
 * - Кнопка перезарядки: видима справа вверху
 */
export class TouchController {
    constructor(canvas) {
        this.canvas = canvas;
        
        // Левый джойстик (движение)
        this.leftStick = {
            active: false,
            touchId: null,
            baseX: 0,
            baseY: 0,
            currentX: 0,
            currentY: 0,
            normX: 0,
            normY: 0,
            rawDistance: 0,      // Сырое расстояние от центра для определения бега
            touchStartX: 0,      // Начальная X для порога тапа
            touchStartY: 0,      // Начальная Y для порога тапа
            movedDistance: 0     // Насколько палец сдвинулся от точки касания
        };
        
        // Правая область (камера + выстрел)
        this.rightArea = {
            active: false,
            touchId: null,
            prevX: 0,      // Предыдущая позиция X для вычисления дельты
            prevY: 0,      // Предыдущая позиция Y для вычисления дельты
            currentX: 0,
            currentY: 0,
            delta: 0,      // Дельта перемещения по X за текущий кадр (для поворота камеры)
            tapDetected: false,  // Было ли это касание определено как тап
            movedDistance: 0,    // Насколько палец сдвинулся от точки касания
            touchStartX: 0,     // Начальная X для порога тапа
            touchStartY: 0      // Начальная Y для порога тапа
        };
        
        // Выстрел (тап в правой области без значительного движения)
        this.triggerShoot = false;
        this.triggerButton = false;
        
        // Бег (сильное отклонение левого стика)
        this.runButton = false;
        
        // Перезарядка (видимая кнопка)
        this.bButton = false;
        this.reloadButtonHeld = false;
        
        // Радиусы для визуализации и логики
        this.stickMaxRadius = 60;       // Макс. радиус движения стика
        this.stickVisualRadius = 55;    // Визуальный радиус основы
        this.knobVisualRadius = 28;     // Визуальный радиус грибка
        this.tapThreshold = 20;         // Если палец сдвинулся менее чем на 20px — это тап
        
        // Кнопка перезарядки
        this.reloadButton = {
            x: 0,
            y: 0,
            radius: 32
        };
        
        // Тап выстрела вторым пальцем в верхней трети при активном rightArea
        this.shootTap = {
            active: false,
            touchId: null,
            startX: 0,
            startY: 0,
            movedDistance: 0,
            cancelled: false
        };

        // Mapping touchId -> action для корректного отслеживания между событиями
        this.touchActions = new Map();

        // Флаг тач-устройства
        this.isConnected = false;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        this.canvas.addEventListener('touchcancel', (e) => this.handleTouchCancel(e), { passive: false });
        
        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            this.isConnected = true;
        }
        
        window.addEventListener('resize', () => this.updateReloadButton());
        window.addEventListener('orientationchange', () => this.updateReloadButton());
        this.updateReloadButton();
    }

    /**
     * Позиция кнопки перезарядки (правыйверхний угол)
     */
    updateReloadButton() {
        const w = window.innerWidth;
        const h = window.innerHeight;

        this.reloadButton.x = w - 60;
        this.reloadButton.y = 80;
    }
    
    /**
     * Проверка попадания в кнопку перезарядки
     */
    isInsideReloadButton(x, y) {
        const dx = x - this.reloadButton.x;
        const dy = y - this.reloadButton.y;
        return dx * dx + dy * dy <= this.reloadButton.radius * this.reloadButton.radius;
    }
    
    /* ===================== TOUCH HANDLERS ===================== */
    
    handleTouchStart(e) {
        e.preventDefault();
        this.isConnected = true;
        
        const w = this.canvas.width;
        const halfX = w / 2;
        
        for (const touch of e.changedTouches) {
            const x = touch.clientX;
            const y = touch.clientY;
            const id = touch.identifier;
            
            // 1. Проверяем кнопку перезарядки
            if (this.isInsideReloadButton(x, y)) {
                this.bButton = true;
                this.reloadButtonHeld = true;
                this.touchActions.set(id, 'reload');
                continue;
            }
            
            // 2. Левая половина — джойстик движения
            if (x < halfX && !this.leftStick.active) {
                this.leftStick.active = true;
                this.leftStick.touchId = id;
                this.leftStick.baseX = x;
                this.leftStick.baseY = y;
                this.leftStick.currentX = x;
                this.leftStick.currentY = y;
                this.leftStick.normX = 0;
                this.leftStick.normY = 0;
                this.leftStick.rawDistance = 0;
                this.leftStick.touchStartX = x;
                this.leftStick.touchStartY = y;
                this.leftStick.movedDistance = 0;
                this.touchActions.set(id, 'leftStick');
                continue;
            }
            
            // 3. Правая половина — тап или камера (ведение пальцем)
            if (x >= halfX && !this.rightArea.active) {
                this.rightArea.active = true;
                this.rightArea.touchId = id;
                this.rightArea.prevX = x;
                this.rightArea.prevY = y;
                this.rightArea.currentX = x;
                this.rightArea.currentY = y;
                this.rightArea.delta = 0;
                this.rightArea.tapDetected = false;
                this.rightArea.movedDistance = 0;
                this.rightArea.touchStartX = x;
                this.rightArea.touchStartY = y;
                
                this.touchActions.set(id, 'rightArea');
                continue;
            }
            
            // 4. Второй палец — тап выстрела в верхней трети при активном rightArea
            if (this.rightArea.active && !this.shootTap.active && x >= halfX
                    && y < (window.innerHeight / 3)
                    && !this.isInsideReloadButton(x, y)) {
                this.shootTap.active = true;
                this.shootTap.touchId = id;
                this.shootTap.startX = x;
                this.shootTap.startY = y;
                this.shootTap.movedDistance = 0;
                this.shootTap.cancelled = false;
                this.touchActions.set(id, 'shootTap');
                continue;
            }

            // Если левый стик уже активен — игнорируем дополнительные тачи слева
            // (иначе включится второй джойстик)
        }
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        
        for (const touch of e.changedTouches) {
            const x = touch.clientX;
            const y = touch.clientY;
            const id = touch.identifier;
            
            // Левый стик — движение
            if (this.leftStick.active && this.leftStick.touchId === id) {
                let dx = x - this.leftStick.baseX;
                let dy = y - this.leftStick.baseY;
                
                const distance = Math.sqrt(dx * dx + dy * dy);
                this.leftStick.rawDistance = distance;
                
                // Авто-бег: если отклонение > 50% от макс. радиуса
                const runThreshold = this.stickMaxRadius * 0.5;
                if (distance > runThreshold) {
                    this.runButton = true;
                } else {
                    this.runButton = false;
                }
                
                // Ограничиваем
                if (distance > this.stickMaxRadius) {
                    const scale = this.stickMaxRadius / distance;
                    dx *= scale;
                    dy *= scale;
                }
                
                this.leftStick.currentX = x;
                this.leftStick.currentY = y;
                this.leftStick.normX = dx / this.stickMaxRadius;
                this.leftStick.normY = dy / this.stickMaxRadius;

                // Отслеживаем расстояние от начальной точки для определения тапа
                const ddx = x - this.leftStick.touchStartX;
                const ddy = y - this.leftStick.touchStartY;
                const currentMovedDist = Math.sqrt(ddx * ddx + ddy * ddy);
                this.leftStick.movedDistance = Math.max(this.leftStick.movedDistance, currentMovedDist);
            }
            
            // Правая область — камера (ведение пальцем: дельта перемещения)
            if (this.rightArea.active && this.rightArea.touchId === id) {
                // Вычисляем дельту от предыдущей позиции
                this.rightArea.delta = x - this.rightArea.prevX;

                // Обновляем текущее и предыдущее положение
                this.rightArea.prevX = x;
                this.rightArea.prevY = y;
                this.rightArea.currentX = x;
                this.rightArea.currentY = y;

                // Вычисляем расстояние от начальной точки касания
                const dx = x - this.rightArea.touchStartX;
                const dy = y - this.rightArea.touchStartY;
                const currentMovedDist = Math.sqrt(dx * dx + dy * dy);
                this.rightArea.movedDistance = Math.max(this.rightArea.movedDistance, currentMovedDist);
            }

            // Тап выстрела вторым пальцем — отменяем если палец ушел далеко
            if (this.shootTap.active && this.shootTap.touchId === id && !this.shootTap.cancelled) {
                const dx = x - this.shootTap.startX;
                const dy = y - this.shootTap.startY;
                this.shootTap.movedDistance = Math.max(this.shootTap.movedDistance, Math.sqrt(dx * dx + dy * dy));
                if (this.shootTap.movedDistance > this.tapThreshold) {
                    this.shootTap.cancelled = true;
                }
            }
        }
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        
        for (const touch of e.changedTouches) {
            const id = touch.identifier;
            const action = this.touchActions.get(id);
            
            // Кнопка перезарядки
            if (action === 'reload') {
                this.bButton = false;
                this.reloadButtonHeld = false;
            }
            
            // Левый стик
            if (action === 'leftStick' || (this.leftStick.active && this.leftStick.touchId === id)) {
                // Если палец практически не двигался — это ТАП = ВЫСТРЕЛ
                if (this.leftStick.movedDistance < this.tapThreshold) {
                    this.triggerShoot = true;
                    this.triggerButton = true;
                }

                this.leftStick.active = false;
                this.leftStick.touchId = null;
                this.leftStick.normX = 0;
                this.leftStick.normY = 0;
                this.leftStick.rawDistance = 0;
                this.leftStick.movedDistance = 0;
                this.runButton = false;
            }
            
            // Тап выстрела вторым пальцем
            if (action === 'shootTap' && this.shootTap.active) {
                if (!this.shootTap.cancelled) {
                    this.triggerShoot = true;
                    this.triggerButton = true;
                }
                this.shootTap.active = false;
                this.shootTap.touchId = null;
                this.shootTap.movedDistance = 0;
                this.shootTap.cancelled = false;
            }

            // Правая область
            if (action === 'rightArea' || (this.rightArea.active && this.rightArea.touchId === id)) {
                // Если палец практически не двигался — это ТАП = ВЫСТРЕЛ
                if (this.rightArea.movedDistance < this.tapThreshold) {
                    this.triggerShoot = true;
                    this.triggerButton = true;
                }

                this.rightArea.active = false;
                this.rightArea.touchId = null;
                this.rightArea.delta = 0;
                this.rightArea.movedDistance = 0;
            }

            // Удаляем действие из карты
            this.touchActions.delete(id);
        }
    }
    
    handleTouchCancel(e) {
        e.preventDefault();
        this.touchActions.clear();
        this.reset();
    }
    
    /* ===================== API ===================== */
    
    /**
     * Данные в формате gamepad (для Player.update)
     */
    getControllerData() {
        const deadZone = 0.15;
        
        // Дедзона для левого стика
        let leftX = this.leftStick.normX;
        let leftY = this.leftStick.normY;
        
        if (Math.abs(leftX) < deadZone) leftX = 0;
        else if (leftX > 0) leftX = (leftX - deadZone) / (1 - deadZone);
        else leftX = (leftX + deadZone) / (1 - deadZone);
        
        if (Math.abs(leftY) < deadZone) leftY = 0;
        else if (leftY > 0) leftY = (leftY - deadZone) / (1 - deadZone);
        else leftY = (leftY + deadZone) / (1 - deadZone);
        
        return {
            connected: this.isConnected,
            leftStickX: leftX,
            leftStickY: leftY,
            rightStickX: this.rightArea.delta,   // Дельта перемещения по X (пиксели за кадр)
            rightStickY: 0,
            runButton: this.runButton,
            triggerButton: this.triggerButton,  // Будет true только один кадр при тапе
            aButton: false,
            bButton: this.bButton,
            source: 'touch'
        };
    }
    
    /**
     * Сброс триггера выстрела (вызывается каждый кадр из Game для debounce)
     */
    clearShootTrigger() {
        this.triggerShoot = false;
        this.triggerButton = false;
    }
    
    /* ===================== RENDER ===================== */
    
    render(ctx, width, height) {
        if (!this.isConnected) return;
        
        // Левый стик
        if (this.leftStick.active) {
            this.drawJoystick(ctx, this.leftStick.baseX, this.leftStick.baseY,
                this.leftStick.normX, this.leftStick.normY, this.runButton);
        } else {
            this.drawStickHint(ctx, width * 0.15, height - 130, 'WASD');
        }
        
        // Кнопка перезарядки
        this.drawReloadButton(ctx);
    }
    
    drawJoystick(ctx, baseX, baseY, normX, normY, isRun) {
        const shakeColor = isRun ? 'rgba(255, 150, 50, 0.25)' : 'rgba(255, 255, 255, 0.15)';
        const knobColor = isRun ? 'rgba(255, 150, 50, 0.55)' : 'rgba(255, 255, 255, 0.4)';
        
        // Основа
        ctx.save();
        ctx.beginPath();
        ctx.arc(baseX, baseY, this.stickVisualRadius, 0, Math.PI * 2);
        ctx.fillStyle = shakeColor;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Кольцо бега
        if (isRun) {
            ctx.beginPath();
            ctx.arc(baseX, baseY, this.stickVisualRadius + 8, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 150, 50, 0.5)';
            ctx.lineWidth = 3;
            ctx.stroke();
        }
        
        // Грибок
        const knobX = baseX + normX * this.stickMaxRadius;
        const knobY = baseY + normY * this.stickMaxRadius;
        
        ctx.beginPath();
        ctx.arc(knobX, knobY, this.knobVisualRadius, 0, Math.PI * 2);
        ctx.fillStyle = knobColor;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.restore();
    }
    
    drawStickHint(ctx, x, y, label) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, this.stickVisualRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Подпись
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#fff';
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // ctx.fillText(label, x, y);
        
        ctx.restore();
    }
    
    drawReloadButton(ctx) {
        const btn = this.reloadButton;
        const isActive = this.bButton;
        
        ctx.save();
        
        // Основа
        ctx.beginPath();
        ctx.arc(btn.x, btn.y, btn.radius, 0, Math.PI * 2);
        
        if (isActive) {
            ctx.fillStyle = 'rgba(68, 136, 255, 0.5)';
            ctx.strokeStyle = 'rgba(68, 136, 255, 0.9)';
        } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        }
        
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Иконка R
        ctx.fillStyle = isActive ? '#fff' : 'rgba(255,255,255,0.7)';
        ctx.font = 'bold 22px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('R', btn.x, btn.y + 1);
        
        ctx.restore();
    }
    
    /* ===================== RESET ===================== */
    
    reset() {
        this.leftStick.active = false;
        this.leftStick.touchId = null;
        this.leftStick.normX = 0;
        this.leftStick.normY = 0;
        this.leftStick.rawDistance = 0;
        
        this.rightArea.active = false;
        this.rightArea.touchId = null;
        this.rightArea.delta = 0;
        this.rightArea.movedDistance = 0;

        this.shootTap.active = false;
        this.shootTap.touchId = null;
        this.shootTap.movedDistance = 0;
        this.shootTap.cancelled = false;

        this.triggerShoot = false;
        this.triggerButton = false;
        this.runButton = false;
        this.bButton = false;
        this.reloadButtonHeld = false;
        
        this.touchActions.clear();
    }
}