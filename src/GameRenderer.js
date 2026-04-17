/**
 * Класс для отрисовки игры
 */
export class GameRenderer {
    constructor(canvas, width, height) {
        this.canvas = canvas;
        this.width = width;
        this.height = height;
        this.ctx = canvas.getContext('2d');
        
        this.bobbing = {
            phase: 0,
            isMoving: false
        };
        
        this.shootTimer = 0;
        this.recoil = 0;
        this.lastShotTime = 0;
        
        // Виньетки
        this.vignette = {
            hit: {
                active: false,
                intensity: 0,
                fadeSpeed: 0.1,
                maxIntensity: 0.7
            },
            lowHealth: {
                active: false,
                intensity: 0,
                minHealthThreshold: 5
            },
            directional: {
                active: false,
                intensity: 0,
                absoluteAngle: 0,
                fadeSpeed: 0.01,
                maxIntensity: 0.9
            }
        };
    }
    
    reset() {
        this.bobbing = {
            phase: 0,
            isMoving: false
        };
        this.shootTimer = 0;
        this.recoil = 0;
        this.lastShotTime = 0;
        this.vignette.hit.active = false;
        this.vignette.hit.intensity = 0;
        this.vignette.lowHealth.active = false;
        this.vignette.lowHealth.intensity = 0;
        this.vignette.directional.active = false;
        this.vignette.directional.intensity = 0;
    }
    
    setBobbing(bobbing) {
        this.bobbing = bobbing;
    }
    
    setShootState(shootTimer, recoil) {
        this.shootTimer = shootTimer;
        this.recoil = recoil;
    }
    
    render(canvas, ctx, width, height, keys, player, weapon, map, TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, enemies, loot, coins, coinsCollected, score, health, isGameOver, gameOverTime, gameOverWin, enemiesKilled) {
        // Вычисляем смещение камеры для эффекта покачивания (Bobbing)
        let cameraBobY = 0;
        let cameraBobX = 0;
        
        const totalSpeed = Math.sqrt(
            player.forwardSpeed * player.forwardSpeed +
            player.strafeSpeed * player.strafeSpeed
        );
        const isRunning = keys['ShiftLeft'] || keys['ShiftRight'];
        const currentMaxSpeed = isRunning ? player.runSpeed : player.walkSpeed;
        const speedRatio = totalSpeed / currentMaxSpeed;
        
        const maxBobbingAmplitude = 2;
        const minBobbingAmplitude = 1;
        const bobbingAmplitude = minBobbingAmplitude + (maxBobbingAmplitude - minBobbingAmplitude) * speedRatio;
        cameraBobY = Math.sin(player.bobbing.phase) * bobbingAmplitude;
        
        const bobValue = Math.sin(player.bobbing.phase);
        if (bobValue < -0.5 && speedRatio > 0.8) {
            const shakeIntensity = (bobValue + 0.5) * 2;
            const shakeFrequency = isRunning ? 2 : 5;
            const shakeAmplitude = isRunning ? 3 : 1;
            cameraBobX = Math.sin(player.bobbing.phase * shakeFrequency) * shakeAmplitude * shakeIntensity;
        }

        // 1. Очистка и отрисовка пола/потолка
        const horizonY = height / 2 + cameraBobY;
        ctx.fillStyle = '#444';
        ctx.fillRect(0, 0, width, horizonY);
        ctx.fillStyle = '#222';
        ctx.fillRect(0, horizonY, width, height - horizonY);

        // 2. Raycasting
        const zBuffer = this.renderWalls(ctx, width, height, horizonY, player, map, TILE_SIZE, cameraBobX);

        // 3. Глобальный слой тумана
        const fogGradient = ctx.createLinearGradient(0, 0, 0, height);
        fogGradient.addColorStop(0, 'rgba(68, 66, 68, 0.3)');
        fogGradient.addColorStop(0.5, 'rgba(68, 68, 68, 0.7)');
        fogGradient.addColorStop(1, 'rgba(68, 68, 68, 0.3)');
        ctx.fillStyle = fogGradient;
        ctx.fillRect(0, 0, width, height);

        // 4. Миникарта
        this.renderMinimap(ctx, width, height, player, map, loot, coins, TILE_SIZE, MAP_WIDTH, MAP_HEIGHT);

        // 5. Враги
        this.renderEnemies(ctx, zBuffer, horizonY, cameraBobX, player, enemies);
        
        // 6. Лут
        this.renderLoot(ctx, zBuffer, horizonY, cameraBobX, player, loot);
        
        // 6.5. Монеты
        this.renderCoins(ctx, zBuffer, horizonY, cameraBobX, player, coins);

        // 7. Оружие
        this.renderWeapon(ctx, width, height, keys, player, weapon);
        
        // 7.5. Виньетки (передаём deltaTime с дефолтным значением для 180 FPS)
        this.drawVignettes(ctx, width, height, player, 5.56);
        
        // 8. Счётчик очков
        this.renderScore(ctx, width, coinsCollected);
        
        // 9. Здоровье
        this.renderHealth(ctx, height, health, player.maxHealth);
        
        // 10. Патроны
        this.renderAmmo(ctx, width, height, weapon);
    
        // 11. Game Over
        if (isGameOver) {
            this.renderGameOver(ctx, width, height, gameOverWin, coinsCollected, enemiesKilled);
        }
        
        return zBuffer;
    }
    
    renderWalls(ctx, width, height, horizonY, player, map, TILE_SIZE, cameraBobX = 0) {
        const numRays = width;
        const rayStep = player.fov / numRays;
        const zBuffer = new Array(numRays).fill(0);
        
        const maxShake = Math.abs(cameraBobX);
        
        for (let i = -maxShake; i < numRays + maxShake; i++) {
            const rayAngle = (player.angle - player.fov / 2) + (i * rayStep);
            
            let rayDirX = Math.cos(rayAngle);
            let rayDirY = Math.sin(rayAngle);

            let mapX = Math.floor(player.x / TILE_SIZE);
            let mapY = Math.floor(player.y / TILE_SIZE);

            const deltaDistX = Math.abs(1 / rayDirX);
            const deltaDistY = Math.abs(1 / rayDirY);

            let stepX, stepY;
            let sideDistX, sideDistY;

            if (rayDirX < 0) {
                stepX = -1;
                sideDistX = (player.x / TILE_SIZE - mapX) * deltaDistX;
            } else {
                stepX = 1;
                sideDistX = (mapX + 1 - player.x / TILE_SIZE) * deltaDistX;
            }

            if (rayDirY < 0) {
                stepY = -1;
                sideDistY = (player.y / TILE_SIZE - mapY) * deltaDistY;
            } else {
                stepY = 1;
                sideDistY = (mapY + 1 - player.y / TILE_SIZE) * deltaDistY;
            }

            let hit = false;
            let side = 0;

            while (!hit) {
                if (sideDistX < sideDistY) {
                    sideDistX += deltaDistX;
                    mapX += stepX;
                    side = 0;
                } else {
                    sideDistY += deltaDistY;
                    mapY += stepY;
                    side = 1;
                }

                if (map[mapY] && map[mapX] && map[mapY][mapX] > 0) {
                    hit = true;
                } else if (mapY < 0 || mapY >= map.length || mapX < 0 || mapX >= map[0].length) {
                    hit = true;
                    side = 0;
                }
            }

            let perpWallDist;
            if (side === 0) {
                perpWallDist = (sideDistX - deltaDistX);
            } else {
                perpWallDist = (sideDistY - deltaDistY);
            }

            const screenX = Math.floor(i + cameraBobX);
            if (screenX >= 0 && screenX < numRays) {
                zBuffer[screenX] = perpWallDist;
            }

            const lineHeight = height / perpWallDist;
            
            const minDistance = 0.3;
            const maxDistance = 5;
            let fogFactor = (perpWallDist - minDistance) / (maxDistance - minDistance);
            fogFactor = Math.max(0, Math.min(1, fogFactor));
            
            const colorX = { r: 245, g: 245, b: 220 };
            const colorY = { r: 225, g: 225, b: 200 };
          
            const baseColor = side === 0 ? colorX : colorY;
            const fogColor = { r: 68, g: 68, b: 68 };
      
            const r = Math.floor(baseColor.r * (1 - fogFactor) + fogColor.r * fogFactor);
            const g = Math.floor(baseColor.g * (1 - fogFactor) + fogColor.g * fogFactor);
            const b = Math.floor(baseColor.b * (1 - fogFactor) + fogColor.b * fogFactor);
        
            ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
            
            if (screenX >= 0 && screenX < width) {
                ctx.beginPath();
                ctx.moveTo(screenX, horizonY - lineHeight / 2);
                ctx.lineTo(screenX, horizonY + lineHeight / 2);
                ctx.stroke();
            }
        }
        
        return zBuffer;
    }
    
    renderMinimap(ctx, width, height, player, map, loot, coins, TILE_SIZE, MAP_WIDTH, MAP_HEIGHT) {
        const minimapSize = width > height ? height / 4 : width / 4;
        const margin = 20;
        const mapScale = minimapSize / Math.max(MAP_WIDTH, MAP_HEIGHT);
        const miniSize = TILE_SIZE * mapScale;
        
        const startX = margin;
        const startY = margin;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(startX, startY, minimapSize, minimapSize);

        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                if (map[y][x] === 1) {
                    ctx.fillStyle = '#888';
                    ctx.fillRect(startX + x * mapScale, startY + y * mapScale, mapScale, mapScale);
                }
            }
        }

        const playerMiniX = startX + (player.x / TILE_SIZE) * mapScale;
        const playerMiniY = startY + (player.y / TILE_SIZE) * mapScale;

        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(playerMiniX, playerMiniY, mapScale / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'red';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(playerMiniX, playerMiniY);
        ctx.lineTo(playerMiniX + Math.cos(player.angle) * mapScale * 2, playerMiniY + Math.sin(player.angle) * mapScale * 2);
        ctx.stroke();
        
        for (let item of loot) {
            const itemMiniX = startX + (item.x / TILE_SIZE) * mapScale;
            const itemMiniY = startY + (item.y / TILE_SIZE) * mapScale;
            ctx.fillStyle = '#00FF00';
            ctx.beginPath();
            ctx.arc(itemMiniX, itemMiniY, mapScale / 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        for (let coin of coins) {
            const coinMiniX = startX + (coin.x / TILE_SIZE) * mapScale;
            const coinMiniY = startY + (coin.y / TILE_SIZE) * mapScale;
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(coinMiniX, coinMiniY, mapScale / 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    renderEnemies(ctx, zBuffer, horizonY, cameraBobX, player, enemies) {
        for (let enemy of enemies) {
            if (enemy.isDead) continue;
            
            const dx = enemy.x - player.x;
            const dy = enemy.y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            const angleToEnemy = Math.atan2(dy, dx);
            let angleDiff = angleToEnemy - player.angle;
            
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

            if (Math.abs(angleDiff) < player.fov / 2 && dist > 10) {
                const screenX = (0.5 * (angleDiff / (player.fov / 2)) + 0.5) * this.width + cameraBobX;
                const spriteHeight = this.height * (enemy.height || 100) / dist * 1;
                const spriteWidth = spriteHeight * 0.35;

                const spriteLeft = Math.max(0, Math.floor(screenX - spriteWidth / 2));
                const spriteRight = Math.min(this.width, Math.ceil(screenX + spriteWidth / 2));

                ctx.save();
                const spriteTopY = horizonY - spriteHeight * 0.3;
                ctx.translate(screenX, spriteTopY + spriteHeight / 2);

                const khakiBase = enemy.isHit ? '#4B5320' : '#556B2F';
                const khakiLight = enemy.isHit ? '#6B7538' : '#808000';
                const khakiDark = enemy.isHit ? '#2F3318' : '#3B4218';
                const helmetColor = enemy.isHit ? '#3B4218' : '#4B5320';
                const skinColor = enemy.isHit ? '#A0522D' : '#D2691E';
                
                // Ноги
                ctx.fillStyle = khakiBase;
                const legWidth = spriteWidth * 0.22;
                const legHeight = spriteHeight * 0.35;
                
                for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                    if (dist >= zBuffer[screenXPos] * 64) continue;
                    const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                    if (relativeX >= -0.64 && relativeX <= -0.2) {
                        ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 + (spriteHeight - legHeight), 1, legHeight);
                    }
                    if (relativeX >= 0.2 && relativeX <= 0.62) {
                        ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 + (spriteHeight - legHeight), 1, legHeight);
                    }
                }
                
                // Камуфляжные пятна на ногах
                ctx.fillStyle = khakiLight;
                for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                    if (dist >= zBuffer[screenXPos] * 64) continue;
                    const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                    if (relativeX >= -0.56 && relativeX <= -0.16) {
                        ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 + spriteHeight * 0.7, 1, legHeight * 0.3);
                    }
                    if (relativeX >= 0.28 && relativeX <= 0.58) {
                        ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 + spriteHeight * 0.8, 1, legHeight * 0.25);
                    }
                }
                
                // Обводка ног
                ctx.fillStyle = khakiDark;
                for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                    if (dist >= zBuffer[screenXPos] * 64) continue;
                    const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                    if (relativeX >= -0.64 && relativeX <= -0.60) {
                        ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 + (spriteHeight - legHeight), 1, legHeight);
                    }
                    if (relativeX >= -0.24 && relativeX <= -0.20) {
                        ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 + (spriteHeight - legHeight), 1, legHeight);
                    }
                    if (relativeX >= 0.20 && relativeX <= 0.24) {
                        ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 + (spriteHeight - legHeight), 1, legHeight);
                    }
                    if (relativeX >= 0.58 && relativeX <= 0.62) {
                        ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 + (spriteHeight - legHeight), 1, legHeight);
                    }
                }

                // Ботинки
                ctx.fillStyle = '#1a1a1a';
                const bootHeight = spriteHeight * 0.08;
                for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                    if (dist >= zBuffer[screenXPos] * 64) continue;
                    const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                    if (relativeX >= -0.64 && relativeX <= -0.2) {
                        ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 + spriteHeight - bootHeight, 1, bootHeight);
                    }
                    if (relativeX >= 0.2 && relativeX <= 0.62) {
                        ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 + spriteHeight - bootHeight, 1, bootHeight);
                    }
                }

                // Шея
                const neckWidth = spriteWidth * 0.20;
                const neckHeight = spriteHeight * 0.12;
                ctx.fillStyle = khakiDark;
                for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                    if (dist >= zBuffer[screenXPos] * 64) continue;
                    const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                    if (Math.abs(relativeX) <= 0.20) {
                        ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 + spriteHeight * 0.25, 1, neckHeight);
                    }
                }

                // Туловище
                ctx.fillStyle = khakiBase;
                const torsoHeight = spriteHeight * 0.35;
                const torsoTopY = -spriteHeight / 2 + spriteHeight * 0.3;
                for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                    if (dist >= zBuffer[screenXPos] * 64) continue;
                    const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                    if (relativeX >= -0.64 && relativeX <= 0.64) {
                        ctx.fillRect(screenXPos - screenX, torsoTopY, 1, torsoHeight);
                    }
                }
          
                // Камуфляжные пятна
                ctx.fillStyle = khakiLight;
                for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                    if (dist >= zBuffer[screenXPos] * 64) continue;
                    const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                    if (relativeX >= -0.5 && relativeX <= -0.1) {
                        ctx.fillRect(screenXPos - screenX, torsoTopY + torsoHeight * 0.2, 1, torsoHeight * 0.25);
                    }
                    if (relativeX >= 0.1 && relativeX <= 0.45) {
                        ctx.fillRect(screenXPos - screenX, torsoTopY + torsoHeight * 0.5, 1, torsoHeight * 0.3);
                    }
                }
                ctx.fillStyle = khakiDark;
                for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                    if (dist >= zBuffer[screenXPos] * 64) continue;
                    const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                    if (relativeX >= -0.3 && relativeX <= -0.1) {
                        ctx.fillRect(screenXPos - screenX, torsoTopY + torsoHeight * 0.4, 1, torsoHeight * 0.2);
                    }
                }
          
                // Обводка туловища
                ctx.fillStyle = khakiDark;
                for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                    if (dist >= zBuffer[screenXPos] * 64) continue;
                    const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                    if (relativeX >= -0.64 && relativeX <= -0.60) {
                        ctx.fillRect(screenXPos - screenX, torsoTopY, 1, torsoHeight);
                    }
                    if (relativeX >= 0.60 && relativeX <= 0.64) {
                        ctx.fillRect(screenXPos - screenX, torsoTopY, 1, torsoHeight);
                    }
                }

                // Руки
                const armWidth = spriteWidth * 0.12;
                const armHeight = spriteHeight * 0.4;
                
                ctx.fillStyle = khakiBase;
                for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                    if (dist >= zBuffer[screenXPos] * 64) continue;
                    const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                    if (relativeX >= -0.96 && relativeX <= -0.72) {
                        ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 + spriteHeight * 0.35, 1, armHeight);
                    }
                }
                ctx.fillStyle = khakiLight;
                for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                    if (dist >= zBuffer[screenXPos] * 64) continue;
                    const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                    if (relativeX >= -0.92 && relativeX <= -0.76) {
                        ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 + spriteHeight * 0.5, 1, armHeight * 0.3);
                    }
                }
                ctx.fillStyle = khakiDark;
                for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                    if (dist >= zBuffer[screenXPos] * 64) continue;
                    const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                    if (relativeX >= -0.96 && relativeX <= -0.92) {
                        ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 + spriteHeight * 0.35, 1, armHeight);
                    }
                    if (relativeX >= -0.76 && relativeX <= -0.72) {
                        ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 + spriteHeight * 0.35, 1, armHeight);
                    }
                }
                
                ctx.fillStyle = khakiBase;
                for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                    if (dist >= zBuffer[screenXPos] * 64) continue;
                    const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                    if (relativeX >= 0.72 && relativeX <= 0.96) {
                        ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 + spriteHeight * 0.35, 1, armHeight);
                    }
                }
                ctx.fillStyle = khakiLight;
                for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                    if (dist >= zBuffer[screenXPos] * 64) continue;
                    const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                    if (relativeX >= 0.76 && relativeX <= 0.92) {
                        ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 + spriteHeight * 0.45, 1, armHeight * 0.35);
                    }
                }
                ctx.fillStyle = khakiDark;
                for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                    if (dist >= zBuffer[screenXPos] * 64) continue;
                    const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                    if (relativeX >= 0.72 && relativeX <= 0.76) {
                        ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 + spriteHeight * 0.35, 1, armHeight);
                    }
                    if (relativeX >= 0.92 && relativeX <= 0.96) {
                        ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 + spriteHeight * 0.35, 1, armHeight);
                    }
                }

                // Лицо
                const faceWidth = spriteWidth * 0.28;
                const faceHeight = spriteHeight * 0.18;
                ctx.fillStyle = skinColor;
                for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                    if (dist >= zBuffer[screenXPos] * 64) continue;
                    const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                    if (Math.abs(relativeX) <= 0.28) {
                        const normalizedX = relativeX / 0.28;
                        const y = Math.sqrt(1 - normalizedX * normalizedX * 0.5) * 0.85;
                        const faceHeightAtX = y * faceHeight;
                        ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 + spriteHeight * 0.20 - faceHeightAtX / 2, 1, faceHeightAtX);
                    }
                }

                // Шлем
                const helmetRadius = spriteWidth * 0.30;
                ctx.fillStyle = helmetColor;
                for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                    if (dist >= zBuffer[screenXPos] * 64) continue;
                    const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                    if (Math.abs(relativeX) <= 0.45) {
                        const normalizedX = relativeX / 0.45;
                        const y = Math.sqrt(1 - normalizedX * normalizedX);
                        const helmetHeightAtX = y * helmetRadius;
                        ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 + spriteHeight * 0.18 - helmetHeightAtX, 1, helmetHeightAtX);
                    }
                }
                ctx.fillStyle = khakiDark;
                for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                    if (dist >= zBuffer[screenXPos] * 64) continue;
                    const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                    if (Math.abs(relativeX) <= 0.45) {
                        const normalizedX = relativeX / 0.45;
                        const y = Math.sqrt(1 - normalizedX * normalizedX);
                        const helmetHeightAtX = y * helmetRadius;
                        ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 + spriteHeight * 0.18 - helmetHeightAtX, 1, 2);
                    }
                }
                ctx.fillStyle = khakiDark;
                for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                    if (dist >= zBuffer[screenXPos] * 64) continue;
                    const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                    if (Math.abs(relativeX) <= 0.40) {
                        ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 + spriteHeight * 0.15, 1, helmetRadius * 0.15);
                    }
                }

                // Глаза и рот
                const faceY = -spriteHeight / 2 + spriteHeight * 0.22;
                const eyeOffset = spriteWidth * 0.08;
                const eyeSize = spriteWidth * 0.05;
                
                ctx.fillStyle = enemy.isHit ? '#8B0000' : '#000';
                for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                    if (dist >= zBuffer[screenXPos] * 64) continue;
                    const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                    if (Math.abs(relativeX - (-0.16)) <= 0.1) {
                        const normalizedX = (relativeX + 0.16) / 0.1;
                        const y = Math.sqrt(1 - normalizedX * normalizedX);
                        const eyeHeightAtX = y * eyeSize * 2;
                        ctx.fillRect(screenXPos - screenX, faceY - eyeHeightAtX / 2, 1, eyeHeightAtX);
                    }
                    if (Math.abs(relativeX - 0.16) <= 0.1) {
                        const normalizedX = (relativeX - 0.16) / 0.1;
                        const y = Math.sqrt(1 - normalizedX * normalizedX);
                        const eyeHeightAtX = y * eyeSize * 2;
                        ctx.fillRect(screenXPos - screenX, faceY - eyeHeightAtX / 2, 1, eyeHeightAtX);
                    }
                }

                ctx.strokeStyle = enemy.isHit ? '#8B0000' : '#000';
                ctx.lineWidth = 1.5;
                for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                    if (dist >= zBuffer[screenXPos] * 64) continue;
                    const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                    if (Math.abs(relativeX) <= 0.2) {
                        ctx.beginPath();
                        if (enemy.isHit) {
                            const normalizedX = relativeX / 0.2;
                            const y = Math.sqrt(1 - normalizedX * normalizedX) * 0.1;
                            ctx.moveTo(screenXPos - screenX, faceY + faceHeight * 0.4);
                            ctx.lineTo(screenXPos - screenX, faceY + faceHeight * 0.4 + y * faceHeight * 0.35);
                        } else {
                            ctx.moveTo(screenXPos - screenX, faceY + faceHeight * 0.4);
                            ctx.lineTo(screenXPos - screenX, faceY + faceHeight * 0.4);
                        }
                        ctx.stroke();
                    }
                }

                // "X" при попадании
                if (enemy.isHit) {
                    ctx.strokeStyle = '#FF0000';
                    ctx.lineWidth = 2.5;
                    for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                        if (dist >= zBuffer[screenXPos] * 64) continue;
                        const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                        if (Math.abs(relativeX) <= 0.5) {
                            const normalizedX = relativeX / 0.5;
                            const y1 = Math.abs(normalizedX) * helmetRadius * 0.4;
                            ctx.beginPath();
                            ctx.moveTo(screenXPos - screenX, -spriteHeight / 2 + spriteHeight * 0.15 - y1);
                            ctx.lineTo(screenXPos - screenX, -spriteHeight / 2 + spriteHeight * 0.15 - y1 + 2);
                            ctx.stroke();
                        }
                    }
                }

                ctx.restore();
            }
        }
    }
    
    renderLoot(ctx, zBuffer, horizonY, cameraBobX, player, loot) {
        for (let item of loot) {
            const dx = item.x - player.x;
            const dy = item.y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            const angleToItem = Math.atan2(dy, dx);
            let angleDiff = angleToItem - player.angle;
            
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            
            if (Math.abs(angleDiff) < player.fov / 2 && dist > 10 && dist < 800) {
                const screenX = (0.5 * (angleDiff / (player.fov / 2)) + 0.5) * this.width + cameraBobX;
                
                let baseHeight = this.height * 8 / dist;
                let boxColor, crossColor, scale;
                if (item.type === 'big_medkit') {
                    scale = 1.3;
                    boxColor = '#87CEEB';
                    crossColor = '#FF0000';
                } else {
                    scale = 1.0;
                    boxColor = '#FFFFFF';
                    crossColor = '#FF0000';
                }
                
                const spriteHeight = baseHeight * scale;
                const spriteWidth = spriteHeight * 0.8;
                
                const spriteLeft = Math.max(0, Math.floor(screenX - spriteWidth / 2));
                const spriteRight = Math.min(this.width, Math.ceil(screenX + spriteWidth / 2));
                
                ctx.save();
                const spriteTopY = horizonY + spriteHeight * 1.3;
                ctx.translate(screenX, spriteTopY + spriteHeight / 2);
                
                ctx.fillStyle = boxColor;
                for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                    if (dist >= zBuffer[screenXPos] * 64) continue;
                    const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                    if (relativeX >= -1 && relativeX <= 1) {
                        ctx.fillRect(screenXPos - screenX, -spriteHeight / 2, 1, spriteHeight);
                    }
                }
                
                ctx.fillStyle = '#404040';
                for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                    if (dist >= zBuffer[screenXPos] * 64) continue;
                    const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                    if (relativeX >= -1.0 && relativeX <= -0.96) {
                        ctx.fillRect(screenXPos - screenX, -spriteHeight / 2, 1, spriteHeight);
                    }
                    if (relativeX >= 0.96 && relativeX <= 1.0) {
                        ctx.fillRect(screenXPos - screenX, -spriteHeight / 2, 1, spriteHeight);
                    }
                }
                
                ctx.fillStyle = crossColor;
                const crossSize = spriteHeight * 0.4;
                const crossWidth = crossSize * 0.3;
                
                for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                    if (dist >= zBuffer[screenXPos] * 64) continue;
                    const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                    
                    if (relativeX >= -0.15 && relativeX <= 0.15) {
                        ctx.fillRect(screenXPos - screenX, -crossSize / 2, 1, crossSize);
                    }
                    
                    if (relativeX >= -0.5 && relativeX <= 0.5) {
                        ctx.fillRect(screenXPos - screenX, -crossWidth / 2, 1, crossWidth);
                    }
                }
                
                ctx.restore();
            }
        }
    }
    
    renderCoins(ctx, zBuffer, horizonY, cameraBobX, player, coins) {
        for (let coin of coins) {
            const dx = coin.x - player.x;
            const dy = coin.y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            const angleToCoin = Math.atan2(dy, dx);
            let angleDiff = angleToCoin - player.angle;
            
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            
            if (Math.abs(angleDiff) < player.fov / 2 && dist > 10 && dist < 800) {
                const screenX = (0.5 * (angleDiff / (player.fov / 2)) + 0.5) * this.width + cameraBobX;
                
                const baseHeight = this.height * 6 / dist;
                const spriteHeight = baseHeight;
                const spriteWidth = spriteHeight;
                
                const spriteLeft = Math.max(0, Math.floor(screenX - spriteWidth / 2));
                const spriteRight = Math.min(this.width, Math.ceil(screenX + spriteWidth / 2));
            
                ctx.save();
                const spriteTopY = horizonY + spriteHeight * 1.3;
                ctx.translate(screenX, spriteTopY + spriteHeight / 2);
            
                ctx.fillStyle = '#FFD700';
                for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                    if (dist >= zBuffer[screenXPos] * 64) continue;
                    const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                    if (relativeX >= -1 && relativeX <= 1) {
                        const y = Math.sqrt(1 - relativeX * relativeX) * spriteHeight / 2;
                        ctx.fillRect(screenXPos - screenX, -y, 1, y * 2);
                    }
                }
                
                ctx.fillStyle = '#FFFACD';
                for (let screenXPos = spriteLeft; screenXPos < spriteRight; screenXPos++) {
                    if (dist >= zBuffer[screenXPos] * 64) continue;
                    const relativeX = (screenXPos - screenX) / spriteWidth * 2;
                    if (relativeX >= -0.4 && relativeX <= -0.2) {
                        const y = Math.sqrt(1 - relativeX * relativeX) * spriteHeight / 4;
                        ctx.fillRect(screenXPos - screenX, -spriteHeight / 2 - y, 1, y * 2);
                    }
                }
                
                ctx.restore();
            }
        }
    }
    
    renderWeapon(ctx, width, height, keys, player, weapon) {
        const scale = Math.min(width, height) / 800;
        
        const weaponX = width / 2;
        const weaponY = height;
        
        let bobbingOffsetY = 0;
        let bobbingOffsetX = 0;
        
        const totalSpeed = Math.sqrt(
            player.forwardSpeed * player.forwardSpeed +
            player.strafeSpeed * player.strafeSpeed
        );
        const isRunning = keys['ShiftLeft'] || keys['ShiftRight'];
        const currentMaxSpeed = isRunning ? player.runSpeed : player.walkSpeed;
        const speedRatio = totalSpeed / currentMaxSpeed;
        
        const maxBobbingAmplitude = 6;
        const minBobbingAmplitude = 3;
        const bobbingAmplitude = minBobbingAmplitude + (maxBobbingAmplitude - minBobbingAmplitude) * speedRatio;
        bobbingOffsetY = Math.sin(player.bobbing.phase) * bobbingAmplitude;
        
        const bobValue = Math.sin(player.bobbing.phase);
        if (bobValue < -0.5 && speedRatio > 0.8) {
            const shakeIntensity = (bobValue + 0.5) * 2;
            const shakeFrequency = 20;
            const shakeAmplitude = 1.5;
            bobbingOffsetX = Math.sin(player.bobbing.phase * shakeFrequency) * shakeAmplitude * shakeIntensity;
        }
        
        ctx.save();
        ctx.translate(weaponX + bobbingOffsetX, weaponY + weapon.recoil + bobbingOffsetY);
        ctx.scale(scale, scale);

        // Рукоять
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.moveTo(-35, 0);
        ctx.lineTo(-40, 110);
        ctx.lineTo(40, 110);
        ctx.lineTo(35, 0);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#0d0d0d';
        ctx.fillRect(-30, 40, 60, 55);
        
        // Рама
        ctx.fillStyle = '#4a4a4a';
        ctx.beginPath();
        ctx.moveTo(-42, -15);
        ctx.lineTo(-42, 15);
        ctx.lineTo(42, 15);
        ctx.lineTo(42, -15);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#5a5a5a';
        ctx.fillRect(-40, -20, 80, 12);
        
        // Ствол
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(-18, -85, 36, 75);
        
        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(-14, -85, 28, 75);
        
        ctx.fillStyle = '#000';
        ctx.fillRect(-12, -88, 24, 6);
        
        // Спусковая скоба
        ctx.strokeStyle = '#3a3a3a';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 35, 18, Math.PI, 0);
        ctx.stroke();
        
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(0, 35, 6, Math.PI, 0);
        ctx.fill();
        
        // Затвор
        ctx.fillStyle = '#3d3d3d';
        ctx.fillRect(-45, -35, 90, 25);
        
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(-42, -30, 12, 18);
        ctx.fillRect(30, -30, 12, 18);
        
        ctx.fillStyle = '#252525';
        ctx.fillRect(-48, -28, 8, 35);
        ctx.fillRect(40, -28, 8, 35);
        
        // Эффект выстрела
        if (weapon.isShooting && weapon.shootTimer > 5) {
            ctx.fillStyle = 'rgba(255, 200, 50, 0.8)';
            ctx.beginPath();
            ctx.moveTo(-30, -85);
            ctx.lineTo(0, -130);
            ctx.lineTo(30, -85);
            ctx.closePath();
            ctx.fill();
            
            ctx.fillStyle = 'rgba(255, 255, 100, 0.9)';
            ctx.beginPath();
            ctx.moveTo(-18, -85);
            ctx.lineTo(0, -110);
            ctx.lineTo(18, -85);
            ctx.closePath();
            ctx.fill();
            
            ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
            ctx.beginPath();
            ctx.arc(0, -90, 12, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
    
    drawVignettes(ctx, width, height, player, deltaTime = 5.56) {
        const centerX = width / 2;
        const centerY = height / 2;
        const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);
        
        // Нормализуем deltaTime к базовым 180 FPS (5.56ms)
        const deltaRatio = deltaTime / 5.56;
        const maxDeltaRatio = 6; // Ограничиваем максимум 6-кратным скачком
        const clampedDeltaRatio = Math.min(deltaRatio, maxDeltaRatio);
        
        function createEdgeVignette(intensity, color) {
            const gradient = ctx.createRadialGradient(
                centerX, centerY, 0,
                centerX, centerY, maxRadius
            );
            gradient.addColorStop(0, `rgba(${color}, 0)`);
            gradient.addColorStop(0.7, `rgba(${color}, 0)`);
            gradient.addColorStop(1, `rgba(${color}, ${intensity})`);
            return gradient;
        }
        
        function createDirectionalVignette(intensity, angle) {
            const centerX_circle = centerX + Math.sin(angle) * width * 1.2;
            const centerY_circle = centerY - Math.cos(angle) * height * 1.2;
            
            const distances = [
                Math.sqrt((0 - centerX_circle) ** 2 + (0 - centerY_circle) ** 2),
                Math.sqrt((width - centerX_circle) ** 2 + (0 - centerY_circle) ** 2),
                Math.sqrt((0 - centerX_circle) ** 2 + (height - centerY_circle) ** 2),
                Math.sqrt((width - centerX_circle) ** 2 + (height - centerY_circle) ** 2)
            ];
            const maxDistance = Math.max(...distances);
            const radius = maxDistance * 0.75;

            const gradient = ctx.createRadialGradient(centerX_circle, centerY_circle, 0, centerX_circle, centerY_circle, radius);

            gradient.addColorStop(0, `rgba(255, 0, 0, 1.0)`);
            gradient.addColorStop(0.2, `rgba(255, 0, 0, ${intensity * 0.8})`);
            gradient.addColorStop(0.5, `rgba(200, 0, 0, ${intensity * 0.4})`);
            gradient.addColorStop(1, `rgba(0, 0, 0, 0)`);

            return gradient;
        }
        
        // Обновление виньеток (с учётом deltaTime)
        // Темная виньетка
        if (this.vignette.hit.active) {
            this.vignette.hit.intensity -= this.vignette.hit.fadeSpeed * clampedDeltaRatio;
            if (this.vignette.hit.intensity <= 0) {
                this.vignette.hit.intensity = 0;
                this.vignette.hit.active = false;
            }
        }
        
        // Темно-красная виньетка низкого здоровья - обновляется динамически
        if (player && player.health <= this.vignette.lowHealth.minHealthThreshold) {
            this.vignette.lowHealth.active = true;
            this.vignette.lowHealth.intensity = Math.max(0, 1 - player.health / this.vignette.lowHealth.minHealthThreshold);
        } else {
            this.vignette.lowHealth.active = false;
            this.vignette.lowHealth.intensity = Math.max(0, this.vignette.lowHealth.intensity - 0.02 * clampedDeltaRatio);
        }
        
        // Направленная виньетка
        if (this.vignette.directional.active) {
            this.vignette.directional.intensity -= this.vignette.directional.fadeSpeed * clampedDeltaRatio;
            if (this.vignette.directional.intensity <= 0) {
                this.vignette.directional.intensity = 0;
                this.vignette.directional.active = false;
            }
        }
        
        // Отрисовка виньеток
        if (this.vignette.hit.active && this.vignette.hit.intensity > 0) {
            ctx.fillStyle = createEdgeVignette(this.vignette.hit.intensity, '0, 0, 0');
            ctx.fillRect(0, 0, width, height);
        }
        
        if (this.vignette.lowHealth.active && this.vignette.lowHealth.intensity > 0) {
            ctx.fillStyle = createEdgeVignette(this.vignette.lowHealth.intensity * 0.8, '100, 0, 0');
            ctx.fillRect(0, 0, width, height);
        }
        
        if (this.vignette.directional.active && this.vignette.directional.intensity > 0) {
            let relativeAngle = this.vignette.directional.absoluteAngle - player.angle;
            while (relativeAngle < -Math.PI) relativeAngle += Math.PI * 2;
            while (relativeAngle > Math.PI) relativeAngle -= Math.PI * 2;
            ctx.fillStyle = createDirectionalVignette(this.vignette.directional.intensity, relativeAngle);
            ctx.fillRect(0, 0, width, height);
        }
    }
    
    activateHitVignette() {
        this.vignette.hit.active = true;
        this.vignette.hit.intensity = this.vignette.hit.maxIntensity;
    }
    
    activateDirectionalVignette(absoluteAttackAngle) {
        this.vignette.directional.active = true;
        this.vignette.directional.intensity = this.vignette.directional.maxIntensity;
        this.vignette.directional.absoluteAngle = absoluteAttackAngle;
    }
    
    activateLowHealthVignette(intensity) {
        this.vignette.lowHealth.active = true;
        this.vignette.lowHealth.intensity = intensity;
    }
    
    renderScore(ctx, width, coinsCollected) {
        const margin = 20;
        const x = width - margin;
        const y = margin;
        
        const text = `Монеты: ${coinsCollected}`;
        ctx.font = 'bold 24px Arial';
        const textWidth = ctx.measureText(text).width;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(x - textWidth - 10, y - 20, textWidth + 20, 35);
        
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'right';
        ctx.fillText(text, x - 10, y + 10);
        
        ctx.textAlign = 'left';
    }
    
    renderHealth(ctx, height, health, maxHealth) {
        const margin = 20;
        const x = margin;
        const y = height - margin;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(x, y - 35, 150, 45);
        
        ctx.fillStyle = '#FF0000';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`HP: ${Math.floor(health)}/${Math.floor(maxHealth)}`, x + 10, y - 10);
        
        ctx.textAlign = 'left';
    }
    
    renderAmmo(ctx, width, height, weapon) {
        const margin = 20;
        const x = width - margin;
        const y = height - margin;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(x - 100, y - 35, 110, 45);
        
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'right';
        
        let ammoText = `${weapon.ammo}/∞`;
        
        if (weapon.isReloading) {
            ammoText = '-/∞';
        }
        
        ctx.fillText(ammoText, x - 10, y - 10);
        
        ctx.textAlign = 'left';
    }
    
    renderGameOver(ctx, width, height, isVictory, coinsCollected, enemiesKilled) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, width, height);
        
        ctx.fillStyle = isVictory ? '#00FF00' : '#FF0000';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(isVictory ? 'VICTORY!' : 'GAME OVER', width / 2, height / 2 - 80);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '24px Arial';
        ctx.fillText(`Собранные монеты: ${coinsCollected}`, width / 2, height / 2 - 20);
        ctx.fillText(`Убито врагов: ${enemiesKilled}`, width / 2, height / 2 + 20);
        
        ctx.textAlign = 'left';
    }
}
