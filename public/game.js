const STATE = {
    MENU: 0,
    PLAYING: 1,
    PAUSED: 2
};

let gameState = STATE.MENU;
let score = 0;
let lives = 3;
let gameTime = 0;
let isMobile = false;
let deferredPrompt = null;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const player = {
    x: canvas.width / 2,
    y: canvas.height - 100,
    width: 40,
    height: 60,
    speed: 5,
    color: '#4facfe',
    isShooting: false,
    shootCooldown: 0,
    shootDelay: 15,
    lastDirection: { x: 0, y: 0 }
};


let enemies = [];
const enemyTypes = [
    { color: '#ff416c', speed: 1.5, size: 30, score: 10 },
    { color: '#ff9a00', speed: 2, size: 25, score: 20 },
    { color: '#00ff88', speed: 2.5, size: 20, score: 30 }
];

function spawnEnemy() {
    const type = Math.floor(Math.random() * enemyTypes.length);
    enemies.push({
        x: Math.random() * (canvas.width - 50) + 25,
        y: -50,
        ...enemyTypes[type],
        id: Date.now() + Math.random()
    });
}


let bullets = [];


let particles = [];

function createParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            radius: Math.random() * 3 + 1,
            color,
            life: 30
        });
    }
}


let powerUps = [];


const joystick = {
    baseX: 0,
    baseY: 0,
    handleX: 0,
    handleY: 0,
    radius: 60,
    isActive: false,
    direction: { x: 0, y: 0 },
    magnitude: 0
};

function initJoystick() {
    const container = document.getElementById('joystickContainer');
    const rect = container.getBoundingClientRect();
    
    joystick.baseX = rect.left + container.clientWidth / 2;
    joystick.baseY = rect.top + container.clientHeight / 2;
    joystick.handleX = joystick.baseX;
    joystick.handleY = joystick.baseY;
    
    updateJoystickVisual();
}

function updateJoystickVisual() {
    const handle = document.getElementById('joystickHandle');
    const baseX = document.getElementById('joystickContainer').offsetWidth / 2;
    const baseY = document.getElementById('joystickContainer').offsetHeight / 2;
    
    const x = baseX + joystick.direction.x * joystick.magnitude * joystick.radius;
    const y = baseY + joystick.direction.y * joystick.magnitude * joystick.radius;
    
    handle.style.transform = `translate(${x - 25}px, ${y - 25}px)`;
}


const keys = {};
const touch = { x: 0, y: 0, isActive: false };


window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    
    if (gameState === STATE.PLAYING) {
        if (e.key === ' ' || e.key === 'Spacebar') {
            player.isShooting = true;
        }
        if (e.key === 'p' || e.key === 'Escape') {
            togglePause();
        }
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
    
    if (e.key === ' ' || e.key === 'Spacebar') {
        player.isShooting = false;
    }
});

document.getElementById('shootButton').addEventListener('mousedown', () => {
    if (gameState === STATE.PLAYING) player.isShooting = true;
});
document.getElementById('shootButton').addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameState === STATE.PLAYING) player.isShooting = true;
});

document.getElementById('shootButton').addEventListener('mouseup', () => {
    player.isShooting = false;
});
document.getElementById('shootButton').addEventListener('touchend', (e) => {
    e.preventDefault();
    player.isShooting = false;
});


document.getElementById('joystickContainer').addEventListener('touchstart', handleJoystickStart);
document.getElementById('joystickContainer').addEventListener('touchmove', handleJoystickMove);
document.getElementById('joystickContainer').addEventListener('touchend', handleJoystickEnd);

function handleJoystickStart(e) {
    e.preventDefault();
    joystick.isActive = true;
    handleJoystickMove(e);
}

function handleJoystickMove(e) {
    if (!joystick.isActive) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    const dx = touch.clientX - joystick.baseX;
    const dy = touch.clientY - joystick.baseY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    joystick.magnitude = Math.min(distance / joystick.radius, 1);
    
    if (distance > 0) {
        joystick.direction.x = dx / distance;
        joystick.direction.y = dy / distance;
    } else {
        joystick.direction.x = 0;
        joystick.direction.y = 0;
    }
    
    updateJoystickVisual();
}

function handleJoystickEnd(e) {
    e.preventDefault();
    joystick.isActive = false;
    joystick.magnitude = 0;
    joystick.direction.x = 0;
    joystick.direction.y = 0;
    updateJoystickVisual();
}


function updatePlayer() {
  
    let moveX = 0, moveY = 0;
    
    if (isMobile && joystick.isActive) {
        moveX = joystick.direction.x * joystick.magnitude * player.speed;
        moveY = joystick.direction.y * joystick.magnitude * player.speed;
    } else {
       
        if (keys['arrowleft'] || keys['a']) moveX -= player.speed;
        if (keys['arrowright'] || keys['d']) moveX += player.speed;
        if (keys['arrowup'] || keys['w']) moveY -= player.speed;
        if (keys['arrowdown'] || keys['s']) moveY += player.speed;
        
       
        if (moveX !== 0 && moveY !== 0) {
            moveX *= 0.707;
            moveY *= 0.707;
        }
    }
    
  
    player.x = Math.max(player.width/2, Math.min(canvas.width - player.width/2, player.x + moveX));
    player.y = Math.max(player.height/2, Math.min(canvas.height - player.height/2, player.y + moveY));
    

    if (player.shootCooldown > 0) player.shootCooldown--;
    
    if ((player.isShooting || keys[' ']) && player.shootCooldown === 0) {
        bullets.push({
            x: player.x,
            y: player.y - player.height/2,
            width: 5,
            height: 15,
            speed: 10,
            color: '#00f2fe'
        });
        player.shootCooldown = player.shootDelay;
        createParticles(player.x, player.y - 20, '#00f2fe', 3);
    }
}

function updateEnemies() {
   
    if (Math.random() < 0.02) spawnEnemy();
    
  
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        
      
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            enemy.x += (dx / distance) * enemy.speed * 0.7 + (Math.random() - 0.5) * 0.5;
            enemy.y += (dy / distance) * enemy.speed * 0.7 + (Math.random() - 0.5) * 0.5;
        }
        
      
        const playerDist = Math.sqrt(
            Math.pow(player.x - enemy.x, 2) + 
            Math.pow(player.y - enemy.y, 2)
        );
        
        if (playerDist < (player.width/2 + enemy.size/2)) {
            lives--;
            document.getElementById('livesValue').textContent = lives;
            createParticles(enemy.x, enemy.y, enemy.color, 20);
            enemies.splice(i, 1);
            
            if (lives <= 0) {
                gameOver();
            }
            continue;
        }
        
       
        if (enemy.y > canvas.height + 50) {
            enemies.splice(i, 1);
        }
    }
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.y -= bullet.speed;
        
       
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            const dx = bullet.x - enemy.x;
            const dy = bullet.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < enemy.size/2 + bullet.width/2) {
              
                score += enemy.score;
                document.getElementById('scoreValue').textContent = score;
                createParticles(enemy.x, enemy.y, enemy.color, 25);
                enemies.splice(j, 1);
                bullets.splice(i, 1);
                
              
                if (Math.random() < 0.2) {
                    powerUps.push({
                        x: enemy.x,
                        y: enemy.y,
                        type: Math.floor(Math.random() * 3),
                        size: 20
                    });
                }
                break;
            }
        }
        
        
        if (bullet.y < -20) {
            bullets.splice(i, 1);
        }
    }
}

function updatePowerUps() {
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const p = powerUps[i];
        p.y += 2;
        
      
        const dx = player.x - p.x;
        const dy = player.y - p.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < player.width/2 + p.size/2) {
           
            switch(p.type) {
                case 0:
                    lives = Math.min(5, lives + 1);
                    document.getElementById('livesValue').textContent = lives;
                    break;
                case 1: 
                    player.shootDelay = Math.max(5, player.shootDelay - 3);
                    setTimeout(() => {
                        player.shootDelay = 15;
                    }, 10000);
                    break;
                case 2: 
                    score += 50;
                    document.getElementById('scoreValue').textContent = score;
                    break;
            }
            
            createParticles(p.x, p.y, '#ffff00', 15);
            powerUps.splice(i, 1);
        } else if (p.y > canvas.height + 20) {
            powerUps.splice(i, 1);
        }
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        
       
        p.vy += 0.1;
        
        
        p.radius *= 0.97;
        
        if (p.life <= 0 || p.radius < 0.1) {
            particles.splice(i, 1);
        }
    }
}


function drawPlayer() {
   
    ctx.save();
    ctx.translate(player.x, player.y);
    
   
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.moveTo(0, -player.height/2);
    ctx.lineTo(-player.width/2, player.height/2);
    ctx.lineTo(player.width/2, player.height/2);
    ctx.closePath();
    ctx.fill();
    
   
    ctx.fillStyle = '#a9e4ff';
    ctx.beginPath();
    ctx.ellipse(0, -player.height/4, player.width/4, player.height/4, 0, 0, Math.PI * 2);
    ctx.fill();
    
  
    if (keys['arrowup'] || keys['w'] || joystick.direction.y < -0.1) {
        ctx.fillStyle = '#ff9a00';
        ctx.beginPath();
        ctx.ellipse(0, player.height/2 + 10, player.width/3, 15, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.restore();
}

function drawEnemies() {
    enemies.forEach(enemy => {
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        
    
        ctx.fillStyle = enemy.color;
        ctx.beginPath();
        ctx.arc(0, 0, enemy.size/2, 0, Math.PI * 2);
        ctx.fill();
        
     
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(-enemy.size/4, -enemy.size/6, enemy.size/8, 0, Math.PI * 2);
        ctx.arc(enemy.size/4, -enemy.size/6, enemy.size/8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    });
}

function drawBullets() {
    bullets.forEach(bullet => {
        ctx.fillStyle = bullet.color;
        ctx.fillRect(bullet.x - bullet.width/2, bullet.y, bullet.width, bullet.height);
        
     
        ctx.fillStyle = 'rgba(0, 242, 254, 0.3)';
        ctx.fillRect(bullet.x - bullet.width, bullet.y, bullet.width * 2, bullet.height);
    });
}

function drawPowerUps() {
    powerUps.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        
      
        let color;
        switch(p.type) {
            case 0: color = '#ff416c'; break;
            case 1: color = '#4facfe'; break;
            case 2: color = '#00ff88'; break; 
        }
        
        
        const pulse = Math.sin(Date.now() * 0.01) * 2;
        const size = p.size + pulse;
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, size/2, 0, Math.PI * 2);
        ctx.fill();
        
     
        if (p.type === 0) {
            ctx.fillStyle = 'white';
            ctx.fillRect(-size/4, -3, size/2, 6);
            ctx.fillRect(-3, -size/4, 6, size/2);
        }
        
        ctx.restore();
    });
}

function drawParticles() {
    particles.forEach(p => {
        ctx.globalAlpha = p.life / 30;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
}

function drawBackground() {
   
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#0a0a1a');
    gradient.addColorStop(1, '#1a1a3a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
  
    for (let i = 0; i < 100; i++) {
        const x = (i * 13.7) % canvas.width;
        const y = (i * 7.3) % canvas.height;
        const size = Math.sin(Date.now() * 0.001 + i) * 1.5 + 1.5;
        
        ctx.fillStyle = 'rgba(255, 255, 255, ' + (0.5 + Math.sin(Date.now() * 0.001 + i) * 0.3) + ')';
        ctx.fillRect(x, y, size, size);
    }
}

function render() {
   
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
  
    drawBackground();
    drawParticles();
    drawPowerUps();
    drawBullets();
    drawEnemies();
    drawPlayer();
}


function gameLoop() {
    if (gameState === STATE.PLAYING) {
        updatePlayer();
        updateEnemies();
        updateBullets();
        updatePowerUps();
        updateParticles();
        gameTime++;
    }
    
    render();
    
    requestAnimationFrame(gameLoop);
}

function startGame() {
    
    score = 0;
    lives = 3;
    gameTime = 0;
    enemies = [];
    bullets = [];
    particles = [];
    powerUps = [];
    
    
    player.x = canvas.width / 2;
    player.y = canvas.height - 100;
    player.shootDelay = 15;
    
   
    document.getElementById('scoreValue').textContent = score;
    document.getElementById('livesValue').textContent = lives;
    document.getElementById('pauseScore').textContent = `Score: ${score}`;
    
   
    gameState = STATE.PLAYING;
    document.getElementById('menuScreen').style.display = 'none';
    document.getElementById('gameUI').style.display = 'flex';
    document.getElementById('pauseScreen').style.display = 'none';
    
    
    isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
        initJoystick();
    }
}

function togglePause() {
    if (gameState === STATE.PLAYING) {
        gameState = STATE.PAUSED;
        document.getElementById('pauseScreen').style.display = 'flex';
        document.getElementById('pauseScore').textContent = `Score: ${score}`;
    } else if (gameState === STATE.PAUSED) {
        gameState = STATE.PLAYING;
        document.getElementById('pauseScreen').style.display = 'none';
    }
}

function gameOver() {
    gameState = STATE.MENU;
    document.getElementById('menuScreen').style.display = 'flex';
    document.getElementById('gameUI').style.display = 'none';
    
   
    const startButton = document.getElementById('startButton');
    startButton.textContent = `PLAY AGAIN (Score: ${score})`;
}

function backToMenu() {
    gameState = STATE.MENU;
    document.getElementById('menuScreen').style.display = 'flex';
    document.getElementById('gameUI').style.display = 'none';
    document.getElementById('pauseScreen').style.display = 'none';
}


window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('installPrompt').style.display = 'flex';
    
   
    document.getElementById('installButton').style.display = 'block';
});

async function installPWA() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            console.log('PWA installed successfully');
        }
        
        deferredPrompt = null;
        document.getElementById('installPrompt').style.display = 'none';
    }
}


if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').then(registration => {
            console.log('ServiceWorker registered: ', registration);
        }).catch(error => {
            console.log('ServiceWorker registration failed: ', error);
        });
    });
}


document.getElementById('startButton').addEventListener('click', startGame);
document.getElementById('pauseButton').addEventListener('click', togglePause);
document.getElementById('resumeButton').addEventListener('click', () => {
    gameState = STATE.PLAYING;
    document.getElementById('pauseScreen').style.display = 'none';
});
document.getElementById('menuButton').addEventListener('click', backToMenu);
document.getElementById('installButton').addEventListener('click', installPWA);
document.getElementById('installPromptButton').addEventListener('click', installPWA);


document.getElementById('installButton').style.display = 'none';


gameLoop();


document.addEventListener('visibilitychange', () => {
    if (document.hidden && gameState === STATE.PLAYING) {
        togglePause();
    }
});
