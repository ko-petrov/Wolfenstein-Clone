/**
 * Класс для управления звуковыми эффектами
 */
export class AudioManager {
    constructor() {
        this.audioContext = null;
    }
    
    /**
     * Инициализация аудио контекста (должна вызываться после взаимодействия пользователя)
     */
    init() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }
    
    /**
     * Воспроизведение звука выстрела (синтезированный звук)
     */
    playShootSound() {
        if (!this.audioContext) {
            this.init();
        }
        
        if (!this.audioContext) return;
        
        // Создаем осциллятор для звука выстрела
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Настройка звука выстрела (быстрый спад частоты)
        const now = this.audioContext.currentTime;
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
    playHitSound() {
        if (!this.audioContext) {
            this.init();
        }
        
        if (!this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        
        // Основной низкочастотный звук (удар)
        const oscillator1 = this.audioContext.createOscillator();
        const gainNode1 = this.audioContext.createGain();
        
        oscillator1.connect(gainNode1);
        gainNode1.connect(this.audioContext.destination);
        
        oscillator1.type = 'sawtooth';
        oscillator1.frequency.setValueAtTime(150, now);
        oscillator1.frequency.exponentialRampToValueAtTime(40, now + 0.15);
        
        gainNode1.gain.setValueAtTime(0.8, now);
        gainNode1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        
        oscillator1.start(now);
        oscillator1.stop(now + 0.15);
        
        // Дополнительный осциллятор для "мясистости" звука
        const oscillator2 = this.audioContext.createOscillator();
        const gainNode2 = this.audioContext.createGain();
        
        oscillator2.connect(gainNode2);
        gainNode2.connect(this.audioContext.destination);
        
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
    playEnemyShootSound() {
        if (!this.audioContext) {
            this.init();
        }
        
        if (!this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        
        // Звук выстрела врага (более низкий, чем у игрока)
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
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
    playDamageSound() {
        if (!this.audioContext) {
            this.init();
        }
        
        if (!this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        
        // Резкий звук урона
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
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
    playPickupSound() {
        if (!this.audioContext) {
            this.init();
        }
        
        if (!this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        
        // Приятный звук подбора (высокий тон)
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
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
    playCoinPickupSound() {
        if (!this.audioContext) {
            this.init();
        }
        
        if (!this.audioContext) return;
        
        // Создаем осциллятор для звука монеты
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Звук монеты: высокий тон с быстрым повышением частоты
        const now = this.audioContext.currentTime;
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
     * Воспроизведение звука начала авторегенерации
     */
    playRegenStartSound() {
        if (!this.audioContext) {
            this.init();
        }
        
        if (!this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        
        // Мягкий нарастающий звук начала регенерации
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.type = 'sine';
        // Плавное повышение частоты для "приятного" эффекта
        oscillator.frequency.setValueAtTime(500, now);
        oscillator.frequency.linearRampToValueAtTime(800, now + 0.1);
        
        // Громкость с плавным нарастанием и затуханием
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.25, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        
        oscillator.start(now);
        oscillator.stop(now + 0.15);
    }
    
    /**
     * Воспроизведение звука шагов
     * @param {boolean} isRunning - флаг бега (для изменения звука)
     */
    playFootstepSound(isRunning = false) {
        if (!this.audioContext) {
            this.init();
        }
        
        if (!this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        
        // Основной звук шага (низкочастотный шум/удар)
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
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
    
    /**
     * Воспроизведение звука начала перезарядки
     */
    playReloadStartSound() {
        if (!this.audioContext) {
            this.init();
        }
        
        if (!this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        
        // Звук извлечения магазина (металлический щелчок)
        const oscillator1 = this.audioContext.createOscillator();
        const gainNode1 = this.audioContext.createGain();
        
        oscillator1.connect(gainNode1);
        gainNode1.connect(this.audioContext.destination);
        
        oscillator1.type = 'square';
        oscillator1.frequency.setValueAtTime(400, now);
        oscillator1.frequency.exponentialRampToValueAtTime(200, now + 0.05);
        
        gainNode1.gain.setValueAtTime(0.3, now);
        gainNode1.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        
        oscillator1.start(now);
        oscillator1.stop(now + 0.05);
        
        // Звук опускания магазина (низкий скользящий звук)
        const oscillator2 = this.audioContext.createOscillator();
        const gainNode2 = this.audioContext.createGain();
        
        oscillator2.connect(gainNode2);
        gainNode2.connect(this.audioContext.destination);
        
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
    playReloadLoopSound() {
        if (!this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        
        // Звук вставки патрона (металлический клик)
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
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
    playReloadEndSound() {
        if (!this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        
        // Звук защелкивания магазина (резкий металлический звук)
        const oscillator1 = this.audioContext.createOscillator();
        const gainNode1 = this.audioContext.createGain();
        
        oscillator1.connect(gainNode1);
        gainNode1.connect(this.audioContext.destination);
        
        oscillator1.type = 'square';
        oscillator1.frequency.setValueAtTime(800, now);
        oscillator1.frequency.exponentialRampToValueAtTime(400, now + 0.08);
        
        gainNode1.gain.setValueAtTime(0.35, now);
        gainNode1.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        
        oscillator1.start(now);
        oscillator1.stop(now + 0.08);
        
        // Дополнительный звук взвода затвора
        const oscillator2 = this.audioContext.createOscillator();
        const gainNode2 = this.audioContext.createGain();
        
        oscillator2.connect(gainNode2);
        gainNode2.connect(this.audioContext.destination);
        
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
     * Проверка, инициализирован ли аудио контекст
     * @returns {boolean} true если контекст инициализирован
     */
    isInitialized() {
        return this.audioContext !== null;
    }
}
