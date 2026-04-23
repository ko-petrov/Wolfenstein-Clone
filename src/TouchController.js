/**
 * Тач-управление с двумя зонами:
 * - Левая половина: джойстик движения (сильный наклон = бег)
 * - Правая половина: тап = выстрел, удержание+движение = камера
 * - Кнопка перезарядки: видима справа
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
            rawDistance: 0  // Сырое расстояние от центра для определения бега
        };
        
        // Правый джойстик (камера)
        this.rightStick = {
            active: false,
            touchId: null,
            baseX: 0,
            baseY: 0,
            currentX: 0,
            currentY: 0,
            normX: 0,
            normY: 0,
            movedDistance: 0  // Насколько палец сдвинулся от точки касания
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
        this.updateReloadButton();
    }
    
    /**
     * Позиция кнопки перезарядки
     */
    updateReloadButton() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        this.reloadButton.x = w - 70;
        this.reloadButton.y = h - 90;
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
                // Сохраним touchId чтобы отслеживать окончание
                touch._action = 'reload';
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
                touch._action = 'leftStick';
                continue;
            }
            
            // 3. Правая половина — тап или камера
            if (x >= halfX && !this.rightStick.active) {
                this.rightStick.active = true;
                this.rightStick.touchId = id;
                this.rightStick.baseX = x;
                this.rightStick.baseY = y;
                this.rightStick.currentX = x;
                this.rightStick.currentY = y;
                this.rightStick.normX = 0;
                this.rightStick.normY = 0;
                this.rightStick.movedDistance = 0;
                
                // Важно: ещё не знаем — тап это или движение.
                // Определим по movedDistance когда палец сдвинется или отпустят.
                touch._action = 'rightArea';
                touch._tapDetected = false;
                continue;
            }
            
            // 4. Если левый стик уже активен — игнорируем дополнительные тачи слева
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
            }
            
            // Правая область — камера
            if (this.rightStick.active && this.rightStick.touchId === id) {
                let dx = x - this.rightStick.baseX;
                let dy = y - this.rightStick.baseY;
                
                // Вычислим общее расстояние движения (апдейтим не макс, а текущее)
                const currentMovedDist = Math.sqrt(dx * dx + dy * dy);
                this.rightStick.movedDistance = Math.max(this.rightStick.movedDistance, currentMovedDist);
                
                // Ограничиваем радиус для нормализации
                if (currentMovedDist > this.stickMaxRadius) {
                    const scale = this.stickMaxRadius / currentMovedDist;
                    dx *= scale;
                    dy *= scale;
                }
                
                this.rightStick.currentX = x;
                this.rightStick.currentY = y;
                this.rightStick.normX = dx / this.stickMaxRadius;
                this.rightStick.normY = dy / this.stickMaxRadius;
            }
        }
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        
        for (const touch of e.changedTouches) {
            const id = touch.identifier;
            
            // Кнопка перезарядки
            if (touch._action === 'reload') {
                this.bButton = false;
                this.reloadButtonHeld = false;
            }
            
            // Левый стик
            if (this.leftStick.active && this.leftStick.touchId === id) {
                this.leftStick.active = false;
                this.leftStick.touchId = null;
                this.leftStick.normX = 0;
                this.leftStick.normY = 0;
                this.leftStick.rawDistance = 0;
                this.runButton = false;
            }
            
            // Правая область
            if (this.rightStick.active && this.rightStick.touchId === id) {
                // Если палец практически не двигался — это ТАП = ВЫСТРЕЛ
                if (this.rightStick.movedDistance < this.tapThreshold && !touch._tapDetected) {
                    this.triggerShoot = true;
                    this.triggerButton = true;
                }
                
                this.rightStick.active = false;
                this.rightStick.touchId = null;
                this.rightStick.normX = 0;
                this.rightStick.normY = 0;
                this.rightStick.movedDistance = 0;
            }
        }
    }
    
    handleTouchCancel(e) {
        e.preventDefault();
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
            rightStickX: this.rightStick.normX,
            rightStickY: this.rightStick.normY,
            runButton: this.runButton,
            triggerButton: this.triggerButton,  // Будет true только один кадр при тапе
            aButton: false,
            bButton: this.bButton
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
        
        // Правый стик (камера) — рисуем только при активном движении
        if (this.rightStick.active && this.rightStick.movedDistance >= this.tapThreshold) {
            this.drawJoystick(ctx, this.rightStick.baseX, this.rightStick.baseY,
                this.rightStick.normX, this.rightStick.normY, false);
        } else if (!this.rightStick.active) {
            this.drawStickHint(ctx, width * 0.85, height - 130, 'CAMERA');
        }
        
        // Кнопка перезарядки
        this.drawReloadButton(ctx);
        
        // Подсказка "тап = огонь" справа (только когда не активен правый стик)
        if (!this.rightStick.active) {
            ctx.save();
            ctx.globalAlpha = 0.2;
            ctx.fillStyle = '#fff';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('TAP = FIRE', width * 0.75, height - 50);
            ctx.restore();
        }
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
        ctx.fillText(label, x, y);
        
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
        
        this.rightStick.active = false;
        this.rightStick.touchId = null;
        this.rightStick.normX = 0;
        this.rightStick.normY = 0;
        this.rightStick.movedDistance = 0;
        
        this.triggerShoot = false;
        this.triggerButton = false;
        this.runButton = false;
        this.bButton = false;
        this.reloadButtonHeld = false;
    }
}