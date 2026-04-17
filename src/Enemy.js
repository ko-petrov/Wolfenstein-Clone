/**
 * Класс для управления врагами
 */
export class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 25;
        this.height = 50;
        this.health = Math.floor(Math.random() * 3) + 4;
        this.isHit = false;
        this.hitTimer = 0;
        this.isDead = false;
        this.shootTimer = 0;
        this.shootInterval = 240;
        this.angle = 0;
        this.aimingTimer = 0;
        this.aimingDelay = 90 + Math.floor(Math.random() * 60);
        this.isAiming = false;
    }
    
    takeDamage() {
        this.health--;
        this.isHit = true;
        this.hitTimer = 10;
        
        if (this.health <= 0) {
            this.isDead = true;
            return true;
        }
        return false;
    }
}

export function createEnemy(x, y) {
    return new Enemy(x, y);
}
