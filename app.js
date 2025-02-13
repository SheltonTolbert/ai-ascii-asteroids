// Update canvas creation to append to game-canvas div
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
document.getElementById('game-canvas').appendChild(canvas);

// Move constants to top
const MAX_MISSILES = 4;
const MISSILE_ICON = '⚡';
const BULLET_SPEED = 10;
const SHOT_COOLDOWN = 250;
const BULLET_LIFETIME = 1000;
const ASTEROID_DRAG = 0.995;
const STAR_COUNT = 100;
const GRUVBOX_COLORS = [
    '#fb4934', // red
    '#b8bb26', // green
    '#fabd2f', // yellow
    '#83a598', // blue
    '#d3869b', // purple
    '#8ec07c', // aqua
    '#fe8019'  // orange
];
const BOOSTER_PARTICLES = [];
const MAX_PARTICLES = 20;
const MIN_PARTICLE_LIFETIME = 250; // 0.25 seconds
const MAX_PARTICLE_LIFETIME = 1000; // 1 second
const ROCKET_SPEED = 8;
const EXPLOSION_RADIUS = 100;
const EXPLOSION_PARTICLE_COUNT = 30;
const EXPLOSION_LIFETIME = 1000;
const VICTORY_PARTICLES = [];
const VICTORY_MESSAGES = [
    "COSMIC VICTORY",
    "ASTEROID MASTER",
    "TEXT DESTROYER",
    "VOID CHAMPION"
];
const MAX_TRACKED_CHARS = 20;
const DOT_SIZE = 6;
const DOT_SPACING = 10;
const DOT_ROWS = 4;
let isVictorySequence = false;
let victoryTime = 0;

// Add after existing constants
const DESTRUCTION_PARTICLES = [];
const DESTRUCTION_PARTICLE_LIFETIME = 10000; // 10 seconds
const DESTRUCTION_PARTICLE_DRAG = 0.995;

// Add after existing constants
const MAX_DESTRUCTION_PARTICLES = 100; // Global limit
const PARTICLE_POOL_SIZE = 200;
const PARTICLES_PER_CHAR = 3; // Reduced from 5

// Update particle pool structure (simpler)
const particlePool = Array(PARTICLE_POOL_SIZE).fill(null).map(() => ({
    active: false,
    x: 0, y: 0,
    vx: 0, vy: 0,
    size: 0,
    color: '',
    life: 0,
    created: 0
}));

// Then initialize variables
let textArray = [];
let ship = {
    x: 400,
    y: 300,
    angle: 0,
    vx: 0,
    vy: 0,
    acceleration: 0.2,
    maxSpeed: 8,
    drag: 0.99,
    rotationSpeed: 0.1,
    isThrusting: false,
    lastRocket: 0,
    rocketCooldown: 1000, // 1 second cooldown
    missiles: MAX_MISSILES,
    hasMissileActive: false
};
let asteroids = [];
let keys = {};
let bullets = [];
let lastShot = 0;
const explosions = [];

let stars = [];
let rockets = [];

function initStars() {
    stars = Array(STAR_COUNT).fill().map(() => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        color: GRUVBOX_COLORS[Math.floor(Math.random() * GRUVBOX_COLORS.length)],
        baseSize: 0.5 + Math.random() * 1.5,  // Smaller size range
        pulseSpeed: 0.5 + Math.random() * 2,
        pulseOffset: Math.random() * Math.PI * 2
    }));
}

function init() {
    const userInput = prompt("Enter the text to replace asteroids (separated by commas):");
    if (!userInput) {
        alert("No input provided. Using default text.");
        textArray = ["Asteroid"];
    } else {
        textArray = userInput.split(',').map(text => text.trim());
    }
    resizeCanvas();
    generateAsteroids();
    initStars();
    window.requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function generateAsteroids() {
    asteroids = [];
    for (let i = 0; i < 10; i++) {
        asteroids.push({
            text: textArray[Math.floor(Math.random() * textArray.length)],
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: 30 + Math.random() * 20,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            angle: Math.random() * Math.PI * 2
        });
    }
}

function chunkWord(word) {
    let chunks = [];
    let remaining = word;
    while (remaining.length > 0) {
        const maxChunkSize = Math.min(remaining.length, 3);
        const chunkSize = 1 + Math.floor(Math.random() * maxChunkSize);
        chunks.push(remaining.substring(0, chunkSize));
        remaining = remaining.substring(chunkSize);
    }
    return chunks;
}

function createAsteroidFromChunk(chunk, x, y, parentSize) {
    const speed = 2;
    const angle = Math.random() * Math.PI * 2;
    return {
        text: chunk,
        x: x,
        y: y,
        size: Math.max(20, parentSize * (chunk.length / 3)), // Minimum size
        angle: angle,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed
    };
}

function measureTextBounds(text, fontSize) {
    ctx.font = `${fontSize}px sans-serif`;
    const metrics = ctx.measureText(text);
    return {
        width: metrics.width,
        height: fontSize,
        // Using actual text metrics for better collision
        actualHeight: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
    };
}

function checkCollision(bullet, asteroid) {
    const bounds = measureTextBounds(asteroid.text, asteroid.size);
    const halfWidth = bounds.width / 2;
    const halfHeight = bounds.actualHeight / 2;

    // Transform bullet position relative to asteroid center
    const dx = bullet.x - asteroid.x;
    const dy = bullet.y - asteroid.y;

    // Check if bullet is within the text bounds
    return Math.abs(dx) < halfWidth && Math.abs(dy) < halfHeight;
}

function gameLoop() {
    update();
    draw();
    window.requestAnimationFrame(gameLoop);
}

// Update createBoosterParticle function
function createBoosterParticle() {
    const angle = ship.angle + Math.PI + (Math.random() - 0.5) * 0.5;
    const speed = 2 + Math.random() * 2;
    return {
        x: ship.x - Math.cos(ship.angle) * 10,
        y: ship.y - Math.sin(ship.angle) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: MIN_PARTICLE_LIFETIME + Math.random() * (MAX_PARTICLE_LIFETIME - MIN_PARTICLE_LIFETIME),
        created: Date.now()
    };
}

function createExplosion(x, y) {
    const particles = [];
    for (let i = 0; i < EXPLOSION_PARTICLE_COUNT; i++) {
        const angle = (Math.PI * 2 * i) / EXPLOSION_PARTICLE_COUNT;
        const speed = 2 + Math.random() * 3;
        particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: EXPLOSION_LIFETIME,
            created: Date.now()
        });
    }
    return particles;
}

// Update createDestructionParticles function
function createDestructionParticles(x, y, text, color) {
    const activeParticles = DESTRUCTION_PARTICLES.length;
    const particleCount = Math.min(
        text.length * PARTICLES_PER_CHAR,
        MAX_DESTRUCTION_PARTICLES - activeParticles
    );

    if (particleCount <= 0) return;

    for (let i = 0; i < particleCount; i++) {
        const particle = particlePool.find(p => !p.active);
        if (!particle) break;

        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3;

        particle.active = true;
        particle.x = x;
        particle.y = y;
        particle.vx = Math.cos(angle) * speed;
        particle.vy = Math.sin(angle) * speed;
        particle.size = 2 + Math.random() * 2; // Slightly larger circles
        particle.color = color || '#b8bb26';
        particle.life = DESTRUCTION_PARTICLE_LIFETIME;
        particle.created = Date.now();

        DESTRUCTION_PARTICLES.push(particle);
    }
}

// Update particle management in update function
function update() {
    // Update stars
    const time = Date.now() / 1000;
    stars.forEach(star => {
        star.currentSize = star.baseSize + Math.sin(time * star.pulseSpeed + star.pulseOffset) * 0.5;
    });

    // Update ship thrust state
    ship.isThrusting = keys['ArrowUp'];

    // Update booster particles (now separate from thrust state)
    if (ship.isThrusting) {
        BOOSTER_PARTICLES.push(createBoosterParticle());
        if (BOOSTER_PARTICLES.length > MAX_PARTICLES) {
            BOOSTER_PARTICLES.shift();
        }
    }

    // Update all particles regardless of thrust state
    const currentTime = Date.now();
    for (let i = BOOSTER_PARTICLES.length - 1; i >= 0; i--) {
        const particle = BOOSTER_PARTICLES[i];
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life = particle.life - (currentTime - particle.created);
        
        // Screen wrapping for particles
        particle.x = (particle.x + canvas.width) % canvas.width;
        particle.y = (particle.y + canvas.height) % canvas.height;
        
        if (currentTime - particle.created > particle.life) {
            BOOSTER_PARTICLES.splice(i, 1);
        }
    }

    // Rotation (only affects angle)
    if (keys['ArrowLeft']) ship.angle -= ship.rotationSpeed;
    if (keys['ArrowRight']) ship.angle += ship.rotationSpeed;

    // Thrust (affects velocity based on current angle)
    if (keys['ArrowUp']) {
        const accelerationX = Math.cos(ship.angle) * ship.acceleration;
        const accelerationY = Math.sin(ship.angle) * ship.acceleration;
        ship.vx += accelerationX;
        ship.vy += accelerationY;
    }

    // Apply drag
    ship.vx *= ship.drag;
    ship.vy *= ship.drag;

    // Limit speed
    const speed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
    if (speed > ship.maxSpeed) {
        const ratio = ship.maxSpeed / speed;
        ship.vx *= ratio;
        ship.vy *= ratio;
    }

    // Update position
    ship.x += ship.vx;
    ship.y += ship.vy;

    // Screen wrapping
    ship.x = (ship.x + canvas.width) % canvas.width;
    ship.y = (ship.y + canvas.height) % canvas.height;

    // Update bullets
    bullets = bullets.filter(bullet => {
        // Move bullet
        bullet.x += Math.cos(bullet.angle) * BULLET_SPEED;
        bullet.y += Math.sin(bullet.angle) * BULLET_SPEED;
        
        // Screen wrapping for bullets
        bullet.x = (bullet.x + canvas.width) % canvas.width;
        bullet.y = (bullet.y + canvas.height) % canvas.height;
        
        // Remove bullets after lifetime
        return currentTime - bullet.created < BULLET_LIFETIME;
    });

    // Handle shooting
    if (keys[' '] && currentTime - lastShot > SHOT_COOLDOWN) {
        bullets.push({
            x: ship.x,
            y: ship.y,
            angle: ship.angle,
            created: currentTime
        });
        lastShot = currentTime;
    }

    // Handle rocket firing - updated logic
    if (keys['Shift']) {
        if (!ship.hasMissileActive && currentTime - ship.lastRocket > ship.rocketCooldown && ship.missiles > 0) {
            rockets.push({
                x: ship.x,
                y: ship.y,
                angle: ship.angle,
                created: currentTime,
                canExplode: false,
                armTime: currentTime + 500
            });
            ship.lastRocket = currentTime;
            ship.missiles--;
            ship.hasMissileActive = true;
        }
    } else {
        ship.hasMissileActive = false;
    }

    // Update rockets and check for explosions
    rockets = rockets.filter(rocket => {
        rocket.x += Math.cos(rocket.angle) * ROCKET_SPEED;
        rocket.y += Math.sin(rocket.angle) * ROCKET_SPEED;
        
        // Screen wrapping
        rocket.x = (rocket.x + canvas.width) % canvas.width;
        rocket.y = (rocket.y + canvas.height) % canvas.height;

        // Arm the rocket after delay
        if (currentTime > rocket.armTime) {
            rocket.canExplode = true;
        }

        // Check for manual detonation
        if (rocket.canExplode && keys['Shift']) {
            explosions.push(...createExplosion(rocket.x, rocket.y));
            // Check for asteroids in blast radius
            asteroids = asteroids.filter((asteroid) => {
                const blastDx = asteroid.x - rocket.x;
                const blastDy = asteroid.y - rocket.y;
                const blastDistance = Math.sqrt(blastDx * blastDx + blastDy * blastDy);
                
                if (blastDistance < EXPLOSION_RADIUS) {
                    destroyAsteroid(asteroid, rocket.x, rocket.y);
                    return false;
                }
                return true;
            });
            ship.hasMissileActive = false;
            return false;
        }

        // Check for asteroid hits
        for (let i = asteroids.length - 1; i >= 0; i--) {
            const asteroid = asteroids[i];
            const dx = rocket.x - asteroid.x;
            const dy = rocket.y - asteroid.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (checkCollision(rocket, asteroid)) {
                // Create explosion
                explosions.push(...createExplosion(rocket.x, rocket.y));
                
                // Check for other asteroids in blast radius
                asteroids = asteroids.filter((a, index) => {
                    if (index === i) return false;
                    const blastDx = a.x - rocket.x;
                    const blastDy = a.y - rocket.y;
                    const blastDistance = Math.sqrt(blastDx * blastDx + blastDy * blastDy);
                    
                    if (blastDistance < EXPLOSION_RADIUS) {
                        destroyAsteroid(a, rocket.x, rocket.y);
                        return false;
                    }
                    return true;
                });
                ship.hasMissileActive = false;
                return false;
            }
        }
        return true;
    });

    // Update asteroids with drag
    asteroids.forEach(asteroid => {
        if (asteroid.vx !== undefined && asteroid.vy !== undefined) {
            asteroid.vx *= ASTEROID_DRAG;
            asteroid.vy *= ASTEROID_DRAG;
            asteroid.x += asteroid.vx;
            asteroid.y += asteroid.vy;
            asteroid.x = (asteroid.x + canvas.width) % canvas.width;
            asteroid.y = (asteroid.y + canvas.height) % canvas.height;
        }
    });

    // Check bullet collisions with updated logic
    bullets = bullets.filter(bullet => {
        bullet.x += Math.cos(bullet.angle) * BULLET_SPEED;
        bullet.y += Math.sin(bullet.angle) * BULLET_SPEED;
        bullet.x = (bullet.x + canvas.width) % canvas.width;
        bullet.y = (bullet.y + canvas.height) % canvas.height;

        let hitAsteroid = false;
        for (let i = asteroids.length - 1; i >= 0; i--) {
            const asteroid = asteroids[i];
            if (checkCollision(bullet, asteroid)) {
                hitAsteroid = true;
                destroyAsteroid(asteroid, bullet.x, bullet.y);
                break;
            }
        }
        return !hitAsteroid && Date.now() - bullet.created < BULLET_LIFETIME;
    });

    // Update explosion particles
    for (let i = explosions.length - 1; i >= 0; i--) {
        const particle = explosions[i];
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life = EXPLOSION_LIFETIME - (currentTime - particle.created);
        if (particle.life <= 0) {
            explosions.splice(i, 1);
        }
    }

    // Update destruction particles with optimized function
    updateDestructionParticles(currentTime);

    if (getTotalCharacters() === 0 && !isVictorySequence) {
        startVictorySequence();
    }

    if (isVictorySequence) {
        updateVictorySequence();
    }
}

function startVictorySequence() {
    isVictorySequence = true;
    victoryTime = Date.now();
    // Create spiral of particles
    for (let i = 0; i < 200; i++) {
        const angle = (i / 200) * Math.PI * 20;
        const radius = i * 2;
        VICTORY_PARTICLES.push({
            x: canvas.width / 2 + Math.cos(angle) * radius,
            y: canvas.height / 2 + Math.sin(angle) * radius,
            targetX: canvas.width / 2,
            targetY: canvas.height / 2,
            color: GRUVBOX_COLORS[i % GRUVBOX_COLORS.length],
            speed: 0.02 + Math.random() * 0.03,
            angle: angle,
            radius: radius,
            delay: i * 10
        });
    }
}

function updateVictorySequence() {
    const currentTime = Date.now();
    const elapsed = currentTime - victoryTime;

    VICTORY_PARTICLES.forEach(particle => {
        if (elapsed > particle.delay) {
            const progress = Math.min(1, (elapsed - particle.delay) * particle.speed);
            particle.x = particle.targetX + Math.cos(particle.angle) * (particle.radius * (1 - progress));
            particle.y = particle.targetY + Math.sin(particle.angle) * (particle.radius * (1 - progress));
        }
    });
}

// Update particle rendering in draw function
function draw() {
    ctx.fillStyle = '#282828'; // Gruvbox dark background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Enable glow effect
    ctx.shadowBlur = 5;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';

    // Draw missile UI
    ctx.save();
    ctx.fillStyle = '#fabd2f'; // Gruvbox yellow
    ctx.shadowColor = '#fabd2f';
    ctx.shadowBlur = 15;
    ctx.font = 'bold 24px monospace';
    for (let i = 0; i < ship.missiles; i++) {
        ctx.fillText(MISSILE_ICON, 20 + (i * 30), 40);
    }
    ctx.restore();

    // Draw stars with minimum brightness
    stars.forEach(star => {
        const brightness = Math.floor((Math.sin(Date.now() / 1000 * star.pulseSpeed + star.pulseOffset) * 0.15 + 0.85) * 255);  // Reduced amplitude, higher base
        ctx.fillStyle = star.color + brightness.toString(16).padStart(2, '0');
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.currentSize, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw booster effect (now always renders active particles)
    ctx.save();
    BOOSTER_PARTICLES.forEach(particle => {
        const alpha = particle.life / MAX_PARTICLE_LIFETIME;
        ctx.fillStyle = `rgba(251, 73, 52, ${alpha})`; // Gruvbox red with fade
        ctx.shadowColor = '#fb4934';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.restore();

    // Draw ship
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);
    ctx.shadowColor = '#fb4934';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#fb4934'; // Gruvbox red for the ship
    ctx.beginPath();
    ctx.moveTo(20, 0);          // Point at the right (forward)
    ctx.lineTo(-10, -10);       // Back left
    ctx.lineTo(-10, 10);        // Back right
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Draw bullets
    ctx.shadowColor = '#fe8019';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#fe8019'; // Gruvbox orange
    bullets.forEach(bullet => {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw rockets
    ctx.shadowColor = '#fb4934';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#fb4934';
    rockets.forEach(rocket => {
        ctx.beginPath();
        ctx.arc(rocket.x, rocket.y, 4, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw explosions
    explosions.forEach(particle => {
        const alpha = particle.life / EXPLOSION_LIFETIME;
        ctx.fillStyle = `rgba(251, 73, 52, ${alpha})`;
        ctx.shadowColor = '#fb4934';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw destruction particles
    DESTRUCTION_PARTICLES.forEach(particle => {
        const progress = (Date.now() - particle.created) / particle.life;
        const alpha = 1 - progress;
        
        ctx.beginPath();
        ctx.fillStyle = particle.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.shadowColor = particle.color;
        ctx.shadowBlur = 10;
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw asteroids with centered text
    ctx.shadowColor = '#b8bb26';
    ctx.shadowBlur = 15;
    asteroids.forEach(asteroid => {
        ctx.fillStyle = '#b8bb26'; // Gruvbox green for asteroids
        ctx.font = `${asteroid.size}px sans-serif`;
        const bounds = measureTextBounds(asteroid.text, asteroid.size);
        ctx.fillText(
            asteroid.text, 
            asteroid.x - bounds.width / 2, 
            asteroid.y + bounds.actualHeight / 2
        );
        
        // Uncomment to debug collision boxes
        // ctx.strokeStyle = 'red';
        // ctx.strokeRect(
        //     asteroid.x - bounds.width / 2,
        //     asteroid.y - bounds.actualHeight / 2,
        //     bounds.width,
        //     bounds.actualHeight
        // );
    });

    // Draw character counter dots
    ctx.save();
    const totalChars = Math.min(getTotalCharacters(), MAX_TRACKED_CHARS);
    const dotsPerRow = Math.ceil(MAX_TRACKED_CHARS / DOT_ROWS);
    
    for (let i = 0; i < MAX_TRACKED_CHARS; i++) {
        const row = Math.floor(i / dotsPerRow);
        const col = i % dotsPerRow;
        const x = canvas.width - (dotsPerRow - col) * DOT_SPACING - 20;
        const y = row * DOT_SPACING + 20;
        
        ctx.beginPath();
        ctx.arc(x, y, DOT_SIZE / 2, 0, Math.PI * 2);
        
        if (i < totalChars) {
            ctx.fillStyle = '#b8bb26'; // Gruvbox green for active dots
            ctx.shadowColor = '#b8bb26';
            ctx.shadowBlur = 10;
        } else {
            ctx.fillStyle = 'rgba(168, 153, 132, 0.2)'; // Gruvbox gray for inactive dots
        }
        ctx.fill();
    }
    ctx.restore();

    // Reset shadow effects
    ctx.shadowBlur = 0;

    if (isVictorySequence) {
        // Draw victory particles
        VICTORY_PARTICLES.forEach(particle => {
            ctx.fillStyle = particle.color;
            ctx.shadowColor = particle.color;
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw victory text
        const elapsed = Date.now() - victoryTime;
        if (elapsed > 2000) {
            ctx.save();
            ctx.fillStyle = '#fabd2f';
            ctx.shadowColor = '#fabd2f';
            ctx.shadowBlur = 30;
            ctx.font = 'bold 72px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Animate text
            const messageIndex = Math.floor((elapsed - 2000) / 1000) % VICTORY_MESSAGES.length;
            const message = VICTORY_MESSAGES[messageIndex];
            const scale = 1 + Math.sin(elapsed * 0.003) * 0.1;
            
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.scale(scale, scale);
            ctx.fillText(message, 0, 0);
            
            // Add floating character effect
            const chars = message.split('');
            chars.forEach((char, i) => {
                const charX = (i - chars.length / 2) * 50;
                const y = Math.sin((elapsed * 0.003) + i * 0.5) * 20;
                ctx.fillText(char, charX, y);
            });
            
            ctx.restore();
        }
    }
}

function destroyAsteroid(asteroid, explosionX, explosionY) {
    createDestructionParticles(asteroid.x, asteroid.y, asteroid.text);
    if (asteroid.text.length === 1) {
        // Single letter destroyed - replenish missile
        ship.missiles = Math.min(ship.missiles + 1, MAX_MISSILES);
    }
    if (asteroid.text.length > 1) {
        const chunks = chunkWord(asteroid.text);
        chunks.forEach(chunk => {
            if (chunk.length > 0) {
                asteroids.push(createAsteroidFromChunk(
                    chunk,
                    asteroid.x + (Math.random() - 0.5) * 20,
                    asteroid.y + (Math.random() - 0.5) * 20,
                    asteroid.size
                ));
            }
        });
    }
    asteroids = asteroids.filter(a => a !== asteroid);
}

function getTotalCharacters() {
    return asteroids.reduce((sum, asteroid) => sum + asteroid.text.length, 0);
}

function updateDestructionParticles(currentTime) {
    for (let i = DESTRUCTION_PARTICLES.length - 1; i >= 0; i--) {
        const particle = DESTRUCTION_PARTICLES[i];
        
        // Apply drag
        particle.vx *= DESTRUCTION_PARTICLE_DRAG;
        particle.vy *= DESTRUCTION_PARTICLE_DRAG;
        
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.rotation += particle.rotationSpeed;
        
        // Screen wrapping
        particle.x = (particle.x + canvas.width) % canvas.width;
        particle.y = (particle.y + canvas.height) % canvas.height;
        
        // Check lifetime
        if (currentTime - particle.created > particle.life) {
            particle.active = false;
            DESTRUCTION_PARTICLES.splice(i, 1);
        }
    }
}

window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

window.addEventListener('resize', () => {
    resizeCanvas();
    initStars();
    generateAsteroids(); // Regenerate asteroids to fit new canvas size
});

init();
