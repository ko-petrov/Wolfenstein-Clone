/**
 * Основной файл игры Wolfenstein Clone
 * Использует класс Game из src/Game.js
 */
import { Game } from './src/Game.js';

// Канвас
let canvas;

/**
 * Инициализация игры
 */
function init() {
    canvas = document.getElementById('gameCanvas');
    
    // Создаём экземпляр игры
    const game = new Game(canvas);
    
    // Запускаем игру
    game.start();
}

// Запуск игры при загрузке страницы
window.addEventListener('load', init);