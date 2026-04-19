/**
 * Контроллер сенсорного управления для мобильных устройств
 * Все измерения указаны в реальных миллиметрах (мм)
 * Пиксели конвертируются в мм через DPI экрана
 */

// Конвертация пикселей в миллиметры (стандарт: 1mm = 1/25.4 inch, 1 inch = 96 CSS px)
// mmToPixels: (mm * DPI) / 25.4
// pixelsToMM: (px * 25.4) / DPI
const getDPI = () => {
    const screenDPI = window.devicePixelRatio * 96; // 96 CSS px = 1 inch
    return screenDPI;
};

const pxToMM = (px) => (px * 25.4) / getDPI();
const mmToPx = (mm) => (mm * getDPI()) / 25.4;

// Константы в миллиметрах
const JOYSTICK_MAX_RADIUS_MM = 50;     // Макс радиус джойстика
const JOYSTICK_DEADZONE_MM = 5;       // Мёртвая зона
const JOYSTICK_RADIUS_MM = 80;        // Визуальный размер зоны
const JOYSTICK_THUMB_MM = 30;         // Визуальный размер "пальца" джойстика
const CLICK_MAX_MOVE_MM = 10;         // Макс смещение для клика
const CLICK_MAX_TIME_MS = 200;        // Макс время для клика
const HOLD_START_TIME_MS = 500;       // Время удержания перед поворотом камеры
const RELOAD_SWIPE_MIN_DISTANCE_MM = 30; // Мин дистанция свайпа
const RELOAD_SWIPE_MAX_HORIZONTAL_MM = 20; // Макс горизонтальное смещение
const RELOAD_SWIPE_MAX_TIME_MS = 500;     // Макс время свайпа
const CAMERA_ROTATION_SENSITIVITY = 0.0025; // радиан на мм

export class TouchController {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        
        // Настройки зон (в мм)
        this.joystickZoneWidthMM = options.joystickZoneWidthMM || 33.33; // 1/3 экрана
        this.actionZoneWidthMM = options.actionZoneWidthMM || 66.67;     // 2/3 экрана
        
        // Состояние джойстика
        this.joystick = {
            active: false,
            startX: 0,     // В пикселях
            startY: 0,
            currentX: 0,
            currentY: 0,
            stickX: 0,     // Нормализованный [-1, 1]
            stickY: 0,
            touchId: null
        };
        
        // Состояние зоны действий (правые 2/3)
        this.action = {
            active: false,
            startTime: 0,
            holdStartTime: 0,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            lastMoveX: 0,
            lastMoveY: 0,
            isHolding: false,
            isCameraMode: false,
            shotTriggered: false,
            touchId: null
        };
        
        // Детектор свайпа перезарядки
        this.swipe = {
            active: false,
            startX: 0,
            startY: 0,
            startTime: 0,
            touchId: null,
            triggered: false
        };
        
        // Флаг определения тач-устройства
        this.isTouchDevice = false;
        
        // Конфигурация перезарядки
        this.reloadConfig = {
            enabledInActionZone: true  // Только правые 2/3
        };
        
        // Callback-и для действий
        this.onShot = options.onShot || null;
        this.onReload = options.onReload || null;
        this.onLeftStickChanged = options.onLeftStickChanged || null;
        this.onCameraRotation = options.onCameraRotation || null;
        
        // Внутренние данные для отрисовки
        this.visuals = {
            joystickCenterX: 0,
            joystickCenterY: 0,
            joystickThumbX: 0,
            joystickThumbY: 0,
            showJoystick: false
        };
        
        // Инициализация
        this.init();
    }
    
    /**
     * Инициализация контроллера
     */
    init() {
        this.detectTouchDevice();
        if (!this.isTouchDevice) return;
        
        this.setupEventListeners();
        this.startRenderLoop();
    }
    
    /**
     * Определение тач-устройства
     */
    detectTouchDevice() {
        this.isTouchDevice = ('ontouchstart' in window) ||
                            (navigator.maxTouchPoints > 0) ||
                            (navigator.msMaxTouchPoints > 0) ||
                            (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
        console.log(`[TouchController] Тач-устройство: ${this.isTouchDevice}`);
    }
    
    /**
     * Настройка слушателей событий
     */
    setupEventListeners() {
        if (!this.isTouchDevice) return;
        
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        this.canvas.addEventListener('touchcancel', (e) => this.handleTouchCancel(e), { passive: false });
    }
    
    /**
     * Обработка начала касания
     */
    handleTouchStart(e) {
        if (!this.isTouchDevice) return;
        e.preventDefault();
        
        for (const touch of e.changedTouches) {
            const px = touch.clientX;
            const py = touch.clientY;
            const mmX = pxToMM(touch.clientX);
            const mmY = pxToMM(touch.clientY);
            
            // Проверяем левую треть (джойстик)
            const screenWidthMM = pxToMM(window.innerWidth);
            const joystickThresholdMM = screenWidthMM * (this.joystickZoneWidthMM / 100);
            
            if (mmX < joystickThresholdMM && this.joystick.touchId === null) {
                // Начинаем джойстик
                this.joystick.active = true;
                this.joystick.touchId = touch.identifier;
                this.joystick.startX = touch.clientX;
                this.joystick.startY = touch.clientY;
                this.joystick.currentX = touch.clientX;
                this.joystick.currentY = touch.clientY;
                
                // Рассчитываем центр джойстика в пикселях
                this.visuals.joystickCenterX = touch.clientX;
                this.visuals.joystickCenterY = touch.clientY;
                this.visuals.joystickThumbX = touch.clientX;
                this.visuals.joystickThumbY = touch.clientY;
                this.visuals.showJoystick = true;
                
                this.joystick.stickX = 0;
                this.joystick.stickY = 0;
            }
            // Проверяем правые 2/3 (действие)
            else if (mmX >= joystickThresholdMM && this.action.touchId === null) {
                this.action.active = true;
                this.action.touchId = touch.identifier;
                this.action.startTime = Date.now();
                this.action.holdStartTime = Date.now();
                this.action.startX = touch.clientX;
                this.action.startY = touch.clientY;
                this.action.currentX = touch.clientX;
                this.action.currentY = touch.clientY;
                this.action.lastMoveX = touch.clientX;
                this.action.lastMoveY = touch.clientY;
                this.action.isHolding = false;
                this.action.isCameraMode = false;
                this.action.shotTriggered = false;
                
                // Проверяем возможный свайп перезарядки (только правые 2/3 экрана)
                // Свайп может начаться в любой части правой зоны, не только сверху
                const screenHeightMM = pxToMM(window.innerHeight);
                if (mmY > screenHeightMM * 0.3 && mmY < screenHeightMM * 0.85) {
                    this.swipe.active = true;
                    this.swipe.touchId = touch.identifier;
                    this.swipe.startX = touch.clientX;
                    this.swipe.startY = touch.clientY;
                    this.swipe.startTime = Date.now();
                    this.swipe.triggered = false;
                }
            }
        }
    }
    
    /**
     * Обработка движения касания
     */
    handleTouchMove(e) {
        if (!this.isTouchDevice) return;
        e.preventDefault();
        
        for (const touch of e.changedTouches) {
            const touchId = touch.identifier;
            const px = touch.clientX;
            const py = touch.clientY;
            const mmX = pxToMM(touch.clientX);
            const mmY = pxToMM(touch.clientY);
            
            // Обновляем джойстик
            if (this.joystick.active && touchId === this.joystick.touchId) {
                this.joystick.currentX = px;
                this.joystick.currentY = py;
                
                // Вычисляем вектор смещения в пикселях
                let dx = px - this.joystick.startX;
                let dy = py - this.joystick.startY;
                
                // Вычисляем расстояние в мм
                const distanceMM = Math.sqrt((dx * dx + dy * dy) * (getDPI() / 96) * (getDPI() / 96)) / (25.4 / 1);
                
                // Нормализуем если превышена граница
                const maxRadiusPx = mmToPx(JOYSTICK_MAX_RADIUS_MM);
                const distancePx = Math.sqrt(dx * dx + dy * dy);
                
                if (distancePx > maxRadiusPx) {
                    dx = (dx / distancePx) * maxRadiusPx;
                    dy = (dy / distancePx) * maxRadiusPx;
                }
                
                // Применяем мёртвую зону (в мм, конвертируем в пиксели для сравнения)
                const deadzonePx = mmToPx(JOYSTICK_DEADZONE_MM);
                const normalizedDistPx = Math.sqrt(dx * dx + dy * dy);
                
                if (normalizedDistPx >= deadzonePx) {
                    // Нормализуем к [-1, 1]
                    this.joystick.stickX = dx / maxRadiusPx;
                    this.joystick.stickY = dy / maxRadiusPx;
                } else {
                    this.joystick.stickX = 0;
                    this.joystick.stickY = 0;
                }
                
                // Обновляем визуальное положение
                this.visuals.joystickThumbX = this.joystick.startX + dx;
                this.visuals.joystickThumbY = this.joystick.startY + dy;
            }
            
            // Обновляем действие (правые 2/3)
            if (this.action.active && touchId === this.action.touchId) {
                this.action.currentX = px;
                this.action.currentY = py;
                
                const timeSinceStart = Date.now() - this.action.startTime;
                const dx = px - this.action.startX;
                const dy = py - this.action.startY;
                const moveDistanceMM = Math.sqrt(dx * dx + dy * dy) / (getDPI() / 96) * (25.4 / 1);
                
                // Проверяем движение для режима камеры
                if (moveDistanceMM > CLICK_MAX_MOVE_MM) {
                    this.action.isHolding = true;
                    
                    // Определяем режим по направлению движения
                    const absDx = Math.abs(dx) / (getDPI() / 96) * (25.4 / 1);
                    const absDy = Math.abs(dy) / (getDPI() / 96) * (25.4 / 1);
                    
                    if (absDx > absDy && absDx > mmToPx(15) / (25.4 / 1) * (getDPI() / 96)) {
                        // Горизонтальное движение - режим камеры
                        this.action.isCameraMode = true;
                    }
                }
                
                // Если время удержания истекло и мы в режиме камеры
                if (this.action.isHolding && !this.action.isCameraMode && 
                    (Date.now() - this.action.holdStartTime) > HOLD_START_TIME_MS && moveDistanceMM > 5) {
                    // Автоматически переключаем в режим камеры при длительном удержании с движением
                    const absDx = Math.abs(dx) / (getDPI() / 96) * (25.4 / 1);
                    const absDy = Math.abs(dy) / (getDPI() / 96) * (25.4 / 1);
                    if (absDx > absDy) {
                        this.action.isCameraMode = true;
                    }
                }
                
                this.action.lastMoveX = px;
                this.action.lastMoveY = py;
            }
            
            // Обновляем свайп
            if (this.swipe.active && touchId === this.swipe.touchId) {
                const swipeDx = px - this.swipe.startX;
                const swipeDy = py - this.swipe.startY;
                const swipeTime = Date.now() - this.swipe.startTime;
                
                // Проверяем критерии свайпа
                const swipeDyMM = swipeDy / (getDPI() / 96) * (25.4 / 1);
                const swipeDxMM = Math.abs(swipeDx) / (getDPI() / 96) * (25.4 / 1);
                const swipeDistanceMM = Math.sqrt(swipeDx * swipeDx + swipeDy * swipeDy) / (getDPI() / 96) * (25.4 / 1);
                
                // Свайп должен быть вниз, достаточно длинный, по горизонтали в пределах
                if (swipeDyMM > RELOAD_SWIPE_MIN_DISTANCE_MM &&
                    swipeDxMM < RELOAD_SWIPE_MAX_HORIZONTAL_MM &&
                    swipeTime < RELOAD_SWIPE_MAX_TIME_MS) {
                    this.swipe.triggered = true;
                }
            }
        }
        
        // Сообщаем об изменении джойстика
        if (this.joystick.active && Math.abs(this.joystick.stickX) > 0.01 || Math.abs(this.joystick.stickY) > 0.01) {
            if (this.onLeftStickChanged) {
                this.onLeftStickChanged(this.joystick.stickX, this.joystick.stickY);
            }
        }
        
        // Сообщаем об повороте камеры
        if (this.action.isCameraMode && this.action.isHolding) {
            const dx = this.action.currentX - this.action.startX;
            const dxMM = dx / (getDPI() / 96) * (25.4 / 1);
            const rotation = dxMM * CAMERA_ROTATION_SENSITIVITY;
            
            if (this.onCameraRotation) {
                this.onCameraRotation(rotation);
            }
        }
    }
    
    /**
     * Обработка окончания касания
     */
    handleTouchEnd(e) {
        if (!this.isTouchDevice) return;
        e.preventDefault();
        
        for (const touch of e.changedTouches) {
            const touchId = touch.identifier;
            const timeSinceStart = Date.now() - this.action.startTime;
            
            // Заканчиваем джойстик
            if (this.joystick.active && touchId === this.joystick.touchId) {
                this.joystick.active = false;
                this.joystick.touchId = null;
                this.joystick.stickX = 0;
                this.joystick.stickY = 0;
                this.visuals.showJoystick = false;
                
                if (this.onLeftStickChanged) {
                    this.onLeftStickChanged(0, 0);
                }
            }
            
            // Заканчиваем действие
            if (this.action.active && touchId === this.action.touchId) {
                const totalMoveMM = Math.sqrt(
                    Math.pow(this.action.currentX - this.action.startX, 2) + 
                    Math.pow(this.action.currentY - this.action.startY, 2)
                ) / (getDPI() / 96) * (25.4 / 1);
                
                // Проверяем: короткое касание = выстрел
                if (timeSinceStart <= CLICK_MAX_TIME_MS && totalMoveMM <= CLICK_MAX_MOVE_MM && !this.action.shotTriggered) {
                    this.action.shotTriggered = true;
                    if (this.onShot) {
                        this.onShot();
                    }
                }
                // Проверяем: свайп перезарядки
                else if (this.swipe.triggered) {
                    if (this.onReload) {
                        this.onReload();
                    }
                }
                // Длительное удержание без действий - просто сброс
                else if (this.action.isHolding) {
                    // Если было удержание но не стреляли и не вращали - просто конец
                }
                
                this.action.active = false;
                this.action.touchId = null;
                this.action.isCameraMode = false;
            }
            
            // Заканчиваем свайп
            if (this.swipe.active && touchId === this.swipe.touchId) {
                this.swipe.active = false;
                this.swipe.touchId = null;
            }
        }
    }
    
    /**
     * Обработка отмены касания
     */
    handleTouchCancel(e) {
        if (!this.isTouchDevice) return;
        e.preventDefault();
        
        for (const touch of e.changedTouches) {
            const touchId = touch.identifier;
            
            if (this.joystick.active && touchId === this.joystick.touchId) {
                this.joystick.active = false;
                this.joystick.touchId = null;
                this.joystick.stickX = 0;
                this.joystick.stickY = 0;
                this.visuals.showJoystick = false;
            }
            
            if (this.action.active && touchId === this.action.touchId) {
                this.action.active = false;
                this.action.touchId = null;
            }
            
            if (this.swipe.active && touchId === this.swipe.touchId) {
                this.swipe.active = false;
                this.swipe.touchId = null;
            }
        }
    }
    
    /**
     * Отрисовка визуальных элементов
     */
    render(ctx) {
        if (!this.isTouchDevice) return;
        
        // Отрисовка джойстика
        if (this.visuals.showJoystick) {
            // Зона джойстика (полупрозрачный круг)
            const baseRadiusPx = mmToPx(JOYSTICK_RADIUS_MM);
            ctx.beginPath();
            ctx.arc(this.visuals.joystickCenterX, this.visuals.joystickCenterY, baseRadiusPx, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // "Палец" джойстика
            const thumbRadiusPx = mmToPx(JOYSTICK_THUMB_MM / 2);
            ctx.beginPath();
            ctx.arc(this.visuals.joystickThumbX, this.visuals.joystickThumbY, thumbRadiusPx, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fill();
        }
    }
    
    /**
     * Цикл отрисовки
     */
    startRenderLoop() {
        const render = () => {
            // Очистка визуальных элементов джойстика при отсутствии активных касаний
            if (!this.joystick.active) {
                this.visuals.showJoystick = false;
            }
            requestAnimationFrame(render);
        };
        requestAnimationFrame(render);
    }
    
    /**
     * Получить данные левого стика (для интеграции с игрой)
     * @returns {{x: number, y: number}} нормализованные значения [-1, 1]
     */
    getLeftStickData() {
        if (!this.isTouchDevice) return { x: 0, y: 0 };
        return {
            x: this.joystick.stickX,
            y: this.joystick.stickY
        };
    }
    
    /**
     * Проверка: был лиトリггер выстрела
     */
    wasShotTriggered() {
        return this.action.shotTriggered;
    }
    
    /**
     * Проверка: был ли свайп перезарядки
     */
    wasReloadTriggered() {
        return this.swipe.triggered;
    }
    
    /**
     * Получение текущей ротации камеры
     */
    getCameraRotation() {
        if (!this.action.isCameraMode || !this.action.isHolding) return 0;
        const dx = this.action.currentX - this.action.startX;
        const dxMM = dx / (getDPI() / 96) * (25.4 / 1);
        return dxMM * CAMERA_ROTATION_SENSITIVITY;
    }
    
    /**
     * Проверка: активно ли удержание камеры
     */
    isCameraHolding() {
        return this.action.isCameraMode && this.action.isHolding;
    }
    
    /**
     * Сброс флагов после обработки кадровых событий
     */
    resetFrameFlags() {
        this.action.shotTriggered = false;
        this.swipe.triggered = false;
    }
    
    /**
     * Проверка: является ли устройство тач-устройством
     */
    isActive() {
        return this.isTouchDevice;
    }
    
    /**
     * Обновление callback-ов
     */
    setCallbacks(options) {
        this.onShot = options.onShot || this.onShot;
        this.onReload = options.onReload || this.onReload;
        this.onLeftStickChanged = options.onLeftStickChanged || this.onLeftStickChanged;
        this.onCameraRotation = options.onCameraRotation || this.onCameraRotation;
    }
    
    /**
     * Получение нормализованных данных контроллера для интеграции с Game
     * @returns {Object} данные в формате controllerData
     */
    getControllerData() {
        if (!this.isTouchDevice) {
            return {
                connected: false,
                leftStickX: 0,
                leftStickY: 0,
                rightStickX: 0,
                rightStickY: 0
            };
        }
        
        return {
            connected: this.joystick.active,
            leftStickX: this.joystick.stickX,
            leftStickY: this.joystick.stickY,
            rightStickX: this.action.isCameraMode && this.action.isHolding ? 
                ((this.action.currentX - this.action.startX) / (getDPI() / 96) * (25.4 / 1)) * CAMERA_ROTATION_SENSITIVITY : 0,
            rightStickY: 0
        };
    }
}