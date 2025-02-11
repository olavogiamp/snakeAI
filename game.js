class SnakeGame {
    constructor() {
        // Configurações básicas do jogo
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameContainer = document.querySelector('.game-container');

        // Configurações dos tipos de comida
        this.foodTypes = {
            NORMAL: 'normal',
            SPECIAL: 'special',
            BOMB: 'bomb',
            HEART: 'heart'
        };

        // Cores para cada tipo de comida
        this.foodColors = {
            normal: [
                '#ff4444', '#4444ff', '#44ff44',
                '#ff44ff', '#ffff44', '#44ffff',
                '#ff8844', '#8844ff'
            ],
            special: '#ffd700',
            bomb: '#000000',
            heart: '#ff69b4'
        };

        // Configurar tamanho do canvas
        const size = Math.min(400, Math.min(window.innerWidth - 40, window.innerHeight - 200));
        this.canvas.width = size;
        this.canvas.height = size;
        this.tileSize = size / 20;

        // Configurações dos estágios de evolução
        this.evolutionStages = {
            BASIC: {
                minScore: 0,
                name: 'Cobra Básica',
                colors: ['#66bb6a', '#43a047'],
                glowColor: 'rgba(102, 187, 106, 0.2)',
                scalePattern: true
            },
            SKILLED: {
                minScore: 100,
                name: 'Cobra Habilidosa',
                colors: ['#42a5f5', '#1976d2'],
                glowColor: 'rgba(66, 165, 245, 0.3)',
                scalePattern: true,
                trailEffect: true
            },
            EXPERT: {
                minScore: 250,
                name: 'Cobra Experiente',
                colors: ['#ab47bc', '#7b1fa2'],
                glowColor: 'rgba(171, 71, 188, 0.4)',
                scalePattern: true,
                trailEffect: true,
                energyAura: true
            },
            MASTER: {
                minScore: 500,
                name: 'Cobra Mestre',
                colors: ['#ffd700', '#ffa500'],
                glowColor: 'rgba(255, 215, 0, 0.5)',
                scalePattern: true,
                trailEffect: true,
                energyAura: true,
                goldenEffect: true
            },
            LEGENDARY: {
                minScore: 1000,
                name: 'Cobra Lendária',
                colors: ['#ff4081', '#c51162'],
                glowColor: 'rgba(255, 64, 129, 0.6)',
                scalePattern: true,
                trailEffect: true,
                energyAura: true,
                goldenEffect: true,
                rainbowEffect: true
            }
        };

        // Variáveis para efeitos de evolução
        this.currentStage = this.evolutionStages.BASIC;
        this.evolutionParticles = [];
        this.trailPositions = [];
        this.rainbowHue = 0;

        // Inicializar estado do jogo
        this.initializeGameState();
        
        // Bind de métodos
        this.gameLoop = this.gameLoop.bind(this);
        this.handleKeyPress = this.handleKeyPress.bind(this);
        this.handleResize = this.handleResize.bind(this);
        
        // Setup de event listeners
        this.setupEventListeners();
        
        // Desenhar estado inicial
        this.draw();
    }

    initializeGameState() {
        // Posição inicial da cobra
        const centerTile = Math.floor((this.canvas.width / this.tileSize) / 2);
        this.snake = [
            {x: centerTile, y: centerTile},
            {x: centerTile - 1, y: centerTile},
            {x: centerTile - 2, y: centerTile}
        ];

        // Variáveis de estado
        this.direction = {x: 1, y: 0};
        this.nextDirection = {x: 1, y: 0};
        this.score = 0;
        this.lives = 0;
        this.maxLives = 3;
        this.speed = 150;
        this.normalSpeed = 150;
        this.currentFoodColorIndex = 0;

        // Timers e efeitos
        this.bombTimer = null;
        this.heartTimer = null;
        this.lastLifeGained = null;
        this.slowMotionActive = false;
        this.animationFrameId = null;
        this.lastRenderTime = 0;
        this.foodAnimationOffset = 0;

        // Efeitos visuais
        this.particles = [];
        this.explosionEffect = null;
        this.despawnEffect = null;
        this.foodEatenEffect = null;
        this.effectDuration = 500;
        this.extraFood = null;
        this.deathEffect = false;
        this.deathEffectTime = 0;
        this.deathPosition = null;
        this.fadeOutEffect = false;

        // Resetar efeitos de evolução
        this.evolutionParticles = [];
        this.trailPositions = [];
        this.rainbowHue = 0;
        this.currentStage = this.evolutionStages.BASIC;

        // Gerar primeira comida
        this.food = this.generateFood();
    }

    handleResize() {
        const size = Math.min(400, Math.min(window.innerWidth - 40, window.innerHeight - 200));
        this.canvas.width = size;
        this.canvas.height = size;
        this.tileSize = size / 20;
        this.draw(); // Redesenhar após redimensionar
    }

    generateFood() {
        let newFood;
        const maxX = Math.floor(this.canvas.width / this.tileSize);
        const maxY = Math.floor(this.canvas.height / this.tileSize);
        
        do {
            newFood = {
                x: Math.floor(Math.random() * maxX),
                y: Math.floor(Math.random() * maxY),
                type: this.decideFoodType(),
                createdAt: Date.now(),
                scale: 1
            };
        } while (this.snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
        
        // Configurar tipo específico de comida
        if (newFood.type === this.foodTypes.SPECIAL) {
            newFood.scale = 1.5; // Fruta especial é 50% maior
        }
        
        // Mudar a cor da comida
        if (newFood.type === this.foodTypes.NORMAL) {
            this.currentFoodColorIndex = (this.currentFoodColorIndex + 1) % this.foodColors.normal.length;
        }
        
        // Configurar timer para bomba
        if (newFood.type === this.foodTypes.BOMB) {
            if (this.bombTimer) clearTimeout(this.bombTimer);
            this.bombTimer = setTimeout(() => {
                if (this.food && this.food.type === this.foodTypes.BOMB) {
                    this.createBombDespawnEffect(this.food.x * this.tileSize, this.food.y * this.tileSize);
                    this.food = this.generateFood();
                }
            }, 5000);
        } else if (newFood.type === this.foodTypes.HEART) {
            if (this.heartTimer) clearTimeout(this.heartTimer);
            this.heartTimer = setTimeout(() => {
                if (this.food && this.food.type === this.foodTypes.HEART) {
                    this.createHeartDespawnEffect(this.food.x * this.tileSize, this.food.y * this.tileSize);
                    this.food = this.generateFood();
                }
            }, 3000);
            
            // Gerar uma comida extra quando aparecer um coração
            this.generateExtraFood();
        }
        
        return newFood;
    }

    generateExtraFood() {
        let extraFood;
        do {
            extraFood = {
                x: Math.floor(Math.random() * (this.canvas.width / this.tileSize)),
                y: Math.floor(Math.random() * (this.canvas.height / this.tileSize)),
                type: this.foodTypes.NORMAL,
                createdAt: Date.now()
            };
        } while (
            this.snake.some(segment => segment.x === extraFood.x && segment.y === extraFood.y) ||
            (this.food && extraFood.x === this.food.x && extraFood.y === this.food.y)
        );
        
        this.extraFood = extraFood;
    }

    decideFoodType() {
        // Não gerar bomba se a pontuação for menor que 50
        if (this.score < 50) {
            const random = Math.random();
            if (random < 0.15) return this.foodTypes.SPECIAL;
            return this.foodTypes.NORMAL;
        }

        const random = Math.random();
        // Chance menor de bomba e muito menor de coração
        if (random < 0.12) return this.foodTypes.BOMB;
        if (random < 0.25) return this.foodTypes.SPECIAL;
        if (random < 0.28 && this.lives < this.maxLives) return this.foodTypes.HEART;
        return this.foodTypes.NORMAL;
    }

    setupEventListeners() {
        document.addEventListener('keydown', this.handleKeyPress);
        
        // Mobile controls com bind correto
        const startButton = document.getElementById('startButton');
        const upButton = document.getElementById('upButton');
        const downButton = document.getElementById('downButton');
        const leftButton = document.getElementById('leftButton');
        const rightButton = document.getElementById('rightButton');
        const restartButton = document.getElementById('restartButton');
        
        startButton?.addEventListener('click', () => this.startGame());
        upButton?.addEventListener('click', () => this.setDirection(0, -1));
        downButton?.addEventListener('click', () => this.setDirection(0, 1));
        leftButton?.addEventListener('click', () => this.setDirection(-1, 0));
        rightButton?.addEventListener('click', () => this.setDirection(1, 0));
        restartButton?.addEventListener('click', () => this.startGame());

        // Elementos da UI
        this.gameOverElement = document.getElementById('gameOver');
        this.finalScoreElement = document.getElementById('finalScore');
        
        // Listener para redimensionamento
        window.addEventListener('resize', this.handleResize);
    }

    handleKeyPress(event) {
        switch(event.key) {
            case 'ArrowUp':
                this.setDirection(0, -1);
                break;
            case 'ArrowDown':
                this.setDirection(0, 1);
                break;
            case 'ArrowLeft':
                this.setDirection(-1, 0);
                break;
            case 'ArrowRight':
                this.setDirection(1, 0);
                break;
        }
    }

    setDirection(x, y) {
        // Evitar direção oposta à atual
        if (this.direction.x !== -x && this.direction.y !== -y) {
            this.nextDirection = {x, y};
        }
    }

    update() {
        // Update direction
        this.direction = {...this.nextDirection};
        
        // Calculate new head position
        const head = {...this.snake[0]};
        head.x += this.direction.x;
        head.y += this.direction.y;

        // Check collisions
        const maxX = Math.floor(this.canvas.width / this.tileSize);
        const maxY = Math.floor(this.canvas.height / this.tileSize);
        
        if (this.handleCollision(head, maxX, maxY)) {
            return;
        }

        // Add new head
        this.snake.unshift(head);

        // Handle food collision
        this.handleFoodCollision(head);

        // Verificar evolução
        const newStage = this.getCurrentStage();
        if (newStage !== this.currentStage) {
            this.onEvolution(newStage);
        }

        // Atualizar efeitos de evolução
        this.updateEvolutionEffects();

        // Update effects
        this.updateEffects();
    }

    handleCollision(head, maxX, maxY) {
        // Colisão com parede
        if (head.x < 0 || head.x >= maxX || head.y < 0 || head.y >= maxY) {
            if (this.lives > 0) {
                this.useLife(head);
                return true;
            }
            this.triggerDeath(head, maxX, maxY);
            return true;
        }

        // Colisão com a própria cobra
        const collisionCheck = this.snake.slice(0, -1).some(segment => 
            segment.x === head.x && segment.y === head.y
        );

        if (collisionCheck) {
            if (this.lives > 0) {
                this.useLife(head);
                return true;
            }
            this.triggerDeath(head);
            return true;
        }

        return false;
    }

    useLife(head) {
        this.lives--;
        this.createLifeLostEffect(head.x * this.tileSize, head.y * this.tileSize);
        this.resetPosition();
    }

    resetPosition() {
        const centerTile = Math.floor((this.canvas.width / this.tileSize) / 2);
        this.snake = [
            {x: centerTile, y: centerTile},
            {x: centerTile - 1, y: centerTile},
            {x: centerTile - 2, y: centerTile}
        ];
        this.direction = {x: 1, y: 0};
        this.nextDirection = {x: 1, y: 0};
    }

    triggerDeath(head, maxX = null, maxY = null) {
        this.deathEffect = true;
        this.deathEffectTime = Date.now();
        
        // Calcular posição da morte
        if (maxX !== null && maxY !== null) {
            this.deathPosition = {
                x: head.x < 0 ? 0 : head.x >= maxX ? (maxX - 1) * this.tileSize : head.x * this.tileSize,
                y: head.y < 0 ? 0 : head.y >= maxY ? (maxY - 1) * this.tileSize : head.y * this.tileSize
            };
        } else {
            this.deathPosition = {
                x: head.x * this.tileSize,
                y: head.y * this.tileSize
            };
        }
        
        // Efeito de shake
        this.gameContainer.style.animation = 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both';
        setTimeout(() => {
            this.gameContainer.style.animation = '';
        }, 500);
        
        this.gameOver();
    }

    handleFoodCollision(head) {
        if (head.x === this.food.x && head.y === this.food.y) {
            const foodType = this.food.type;
            
            switch(foodType) {
                case this.foodTypes.BOMB:
                    this.handleBombCollision();
                    break;
                case this.foodTypes.HEART:
                    this.handleHeartCollect(head.x * this.tileSize, head.y * this.tileSize);
                    break;
                case this.foodTypes.SPECIAL:
                    this.handleSpecialFood();
                    break;
                default:
                    this.handleNormalFood();
            }
            
            // Clear timers and generate new food
            this.clearTimers();
            this.food = this.generateFood();
            this.updateSpeed();
        } else if (this.extraFood && head.x === this.extraFood.x && head.y === this.extraFood.y) {
            this.handleExtraFood();
        } else {
            this.snake.pop();
        }
    }

    clearTimers() {
        if (this.bombTimer) {
            clearTimeout(this.bombTimer);
            this.bombTimer = null;
        }
        if (this.heartTimer) {
            clearTimeout(this.heartTimer);
            this.heartTimer = null;
        }
    }

    updateEffects() {
        // Animação da comida
        this.foodAnimationOffset = Math.sin(Date.now() / 200) * 2;

        // Atualizar efeito de comida
        if (this.foodEatenEffect) {
            const timeSinceEaten = Date.now() - this.foodEatenEffect.startTime;
            this.foodEatenEffect.position = (timeSinceEaten / this.effectDuration) * this.snake.length;
            
            if (timeSinceEaten >= this.effectDuration) {
                this.foodEatenEffect = null;
            }
        }

        // Atualizar slow motion
        if (this.slowMotionActive) {
            const timeSinceStart = Date.now() - this.slowMotionStart;
            if (timeSinceStart >= 1000) {
                this.slowMotionActive = false;
                this.speed = this.normalSpeed;
            }
        }
    }

    updateSpeed() {
        this.speed = Math.max(50, 150 - Math.floor(this.score / 50) * 10);
    }

    handleBombCollision() {
        this.createExplosionEffect(this.food.x * this.tileSize, this.food.y * this.tileSize);
        
        // Penalidade de pontos
        this.score = Math.max(0, this.score - 20);
        document.getElementById('score').textContent = this.score;
        
        // Flash vermelho na tela
        this.gameContainer.classList.add('damage');
        setTimeout(() => this.gameContainer.classList.remove('damage'), 300);

        // Remover 2 segmentos da cobra (se possível)
        if (this.snake.length > 3) { // Manter pelo menos 3 segmentos
            const removedSegments = this.snake.splice(-2);
            // Criar efeito de partículas para os segmentos removidos
            removedSegments.forEach(segment => {
                this.createParticleEffect(segment.x * this.tileSize, segment.y * this.tileSize);
            });
        }
        
        // Efeito de shake mais intenso
        this.gameContainer.style.animation = 'shake 0.3s cubic-bezier(.36,.07,.19,.97) both';
        setTimeout(() => {
            this.gameContainer.style.animation = '';
        }, 300);
    }

    handleHeartCollect(x, y) {
        this.lives = Math.min(this.maxLives, this.lives + 1);
        this.lastLifeGained = Date.now();
        this.createHeartCollectEffect(x, y);
        
        // Flash verde na tela
        this.gameContainer.classList.add('heal');
        this.gameContainer.classList.add('pulse');
        setTimeout(() => {
            this.gameContainer.classList.remove('heal');
            this.gameContainer.classList.remove('pulse');
        }, 300);
    }

    handleSpecialFood() {
        this.score += 40;
        document.getElementById('score').textContent = this.score;
        this.createSpecialFoodEffect(this.food.x * this.tileSize, this.food.y * this.tileSize);
        
        // Ativar slow motion
        this.slowMotionActive = true;
        this.slowMotionStart = Date.now();
        this.normalSpeed = this.speed;
        this.speed *= 1.5;
        
        // Efeito visual no container
        this.gameContainer.classList.add('special-food');
        setTimeout(() => {
            this.gameContainer.classList.remove('special-food');
        }, 1000);
        
        // Aumentar tamanho em 4
        for (let i = 0; i < 4; i++) {
            const lastSegment = this.snake[this.snake.length - 1];
            this.snake.push({...lastSegment});
        }
    }

    handleNormalFood() {
        this.score += 10;
        document.getElementById('score').textContent = this.score;
        
        // Aumentar tamanho em 1
        const lastSegment = this.snake[this.snake.length - 1];
        this.snake.push({...lastSegment});
        
        // Efeito visual
        this.foodEatenEffect = {
            color: this.getFoodColor(this.foodTypes.NORMAL),
            position: 0,
            startTime: Date.now()
        };
    }

    handleExtraFood() {
        this.score += 10;
        document.getElementById('score').textContent = this.score;
        
        // Aumentar tamanho em 1
        const lastSegment = this.snake[this.snake.length - 1];
        this.snake.push({...lastSegment});
        
        // Efeito visual
        this.foodEatenEffect = {
            color: this.getFoodColor(this.foodTypes.NORMAL),
            position: 0,
            startTime: Date.now()
        };
        
        this.extraFood = null;
    }

    draw() {
        // Clear canvas com grid sutil
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Grid mais sutil
        this.ctx.strokeStyle = 'rgba(26, 26, 26, 0.3)';
        this.ctx.lineWidth = 0.5;
        
        // Desenhar borda do campo
        this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Voltar para o estilo do grid
        this.ctx.strokeStyle = 'rgba(26, 26, 26, 0.3)';
        this.ctx.lineWidth = 0.5;
        for (let i = 0; i <= this.canvas.width; i += this.tileSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(i, 0);
            this.ctx.lineTo(i, this.canvas.height);
            this.ctx.stroke();
            
            this.ctx.beginPath();
            this.ctx.moveTo(0, i);
            this.ctx.lineTo(this.canvas.width, i);
            this.ctx.stroke();
        }

        // Desenhar sombra da cobra
        this.snake.forEach((segment, index) => {
            const isHead = index === 0;
            const segmentSize = isHead ? this.tileSize : this.tileSize - 1;
            
            // Calcular intensidade do efeito para cada segmento
            let effectIntensity = 0;
            if (this.foodEatenEffect) {
                const distance = Math.abs(index - this.foodEatenEffect.position);
                const effectWidth = 3; // Quantidade de segmentos que o efeito afeta simultaneamente
                if (distance < effectWidth) {
                    effectIntensity = 1 - (distance / effectWidth);
                }
            }
            
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            this.ctx.shadowBlur = 5;
            this.ctx.shadowOffsetX = 2;
            this.ctx.shadowOffsetY = 2;
            
            if (effectIntensity > 0) {
                // Efeito de brilho expandido
                const centerX = segment.x * this.tileSize + this.tileSize/2;
                const centerY = segment.y * this.tileSize + this.tileSize/2;
                
                const glowGradient = this.ctx.createRadialGradient(
                    centerX, centerY, 0,
                    centerX, centerY, this.tileSize * 1.5
                );
                
                const effectColor = this.foodEatenEffect.color;
                glowGradient.addColorStop(0, `${effectColor}${Math.floor(effectIntensity * 255).toString(16).padStart(2, '0')}`);
                glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                
                this.ctx.fillStyle = glowGradient;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, this.tileSize * 1.5, 0, Math.PI * 2);
                this.ctx.fill();
            }
            
            if (isHead) {
                this.drawSnakeHead(
                    segment.x * this.tileSize,
                    segment.y * this.tileSize,
                    segmentSize,
                    this.direction,
                    effectIntensity > 0 ? this.foodEatenEffect.color : null
                );
            } else {
                this.drawSnakeBody(
                    segment.x * this.tileSize,
                    segment.y * this.tileSize,
                    segmentSize,
                    index,
                    effectIntensity > 0 ? this.foodEatenEffect.color : null,
                    effectIntensity
                );
            }
        });
        
        // Resetar sombras antes de desenhar a comida
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;

        // Desenhar comida com base no tipo
        if (this.food) {
            const foodX = (this.food.x * this.tileSize) + this.tileSize/2;
            const foodY = (this.food.y * this.tileSize) + this.tileSize/2;
            
            switch (this.food.type) {
                case this.foodTypes.BOMB:
                    this.drawBomb(foodX, foodY);
                    break;
                case this.foodTypes.SPECIAL:
                    this.drawSpecialFood(foodX, foodY);
                    break;
                case this.foodTypes.HEART:
                    this.drawHeartFood(foodX, foodY);
                    break;
                default:
                    this.drawNormalFood(foodX, foodY);
            }
        }

        // Desenhar comida extra se houver
        if (this.extraFood) {
            const foodX = (this.extraFood.x * this.tileSize) + this.tileSize/2;
            const foodY = (this.extraFood.y * this.tileSize) + this.tileSize/2;
            this.drawNormalFood(foodX, foodY);
        }

        // Efeito de portal nas bordas quando ocorre wrap
        if (this.wrapEffect) {
            const timeSinceWrap = Date.now() - this.wrapEffectTime;
            if (timeSinceWrap < 300) { // Duração do efeito: 300ms
                const alpha = 1 - (timeSinceWrap / 300);
                
                // Desenhar os portais
                this.wrapPortals.forEach(portal => {
                    // Círculo do portal
                    const gradient = this.ctx.createRadialGradient(
                        portal.x + this.tileSize/2,
                        portal.y + this.tileSize/2,
                        0,
                        portal.x + this.tileSize/2,
                        portal.y + this.tileSize/2,
                        this.tileSize * 1.5
                    );
                    gradient.addColorStop(0, `rgba(76, 175, 80, ${alpha * 0.6})`);
                    gradient.addColorStop(1, 'rgba(76, 175, 80, 0)');
                    
                    this.ctx.fillStyle = gradient;
                    this.ctx.beginPath();
                    this.ctx.arc(
                        portal.x + this.tileSize/2,
                        portal.y + this.tileSize/2,
                        this.tileSize * 1.5,
                        0,
                        Math.PI * 2
                    );
                    this.ctx.fill();

                    // Linhas de energia
                    this.ctx.strokeStyle = `rgba(76, 175, 80, ${alpha})`;
                    this.ctx.lineWidth = 2;
                    this.ctx.setLineDash([5, 5]);
                    const rotation = Date.now() / 200;
                    for (let i = 0; i < 4; i++) {
                        const angle = (Math.PI / 2 * i) + rotation;
                        this.ctx.beginPath();
                        this.ctx.moveTo(
                            portal.x + this.tileSize/2,
                            portal.y + this.tileSize/2
                        );
                        this.ctx.lineTo(
                            portal.x + this.tileSize/2 + Math.cos(angle) * this.tileSize,
                            portal.y + this.tileSize/2 + Math.sin(angle) * this.tileSize
                        );
                        this.ctx.stroke();
                    }
                    this.ctx.setLineDash([]);
                });
            } else {
                this.wrapEffect = false;
            }
        }

        // Desenhar efeito de morte se houver colisão com a parede
        if (this.deathEffect) {
            const timeSinceDeath = Date.now() - this.deathEffectTime;
            if (timeSinceDeath < 1000) { // Efeito dura 1 segundo
                const alpha = 1 - (timeSinceDeath / 1000);
                
                // Efeito de explosão
                this.ctx.fillStyle = `rgba(255, 0, 0, ${alpha * 0.5})`;
                this.ctx.beginPath();
                this.ctx.arc(
                    this.deathPosition.x + this.tileSize/2,
                    this.deathPosition.y + this.tileSize/2,
                    this.tileSize * (1 + timeSinceDeath/200),
                    0,
                    Math.PI * 2
                );
                this.ctx.fill();

                // Linhas de impacto
                this.ctx.strokeStyle = `rgba(255, 0, 0, ${alpha})`;
                this.ctx.lineWidth = 2;
                for (let i = 0; i < 8; i++) {
                    const angle = (Math.PI * 2 * i / 8) + (timeSinceDeath / 100);
                    const length = this.tileSize * (1 + timeSinceDeath/100);
                    this.ctx.beginPath();
                    this.ctx.moveTo(
                        this.deathPosition.x + this.tileSize/2,
                        this.deathPosition.y + this.tileSize/2
                    );
                    this.ctx.lineTo(
                        this.deathPosition.x + this.tileSize/2 + Math.cos(angle) * length,
                        this.deathPosition.y + this.tileSize/2 + Math.sin(angle) * length
                    );
                    this.ctx.stroke();
                }
            } else {
                this.deathEffect = false;
            }
        }

        // Efeito de fade out da cobra quando morre
        if (this.fadeOutEffect) {
            const timeSinceDeath = Date.now() - this.deathEffectTime;
            const alpha = Math.max(0, 1 - (timeSinceDeath / 1000));
            this.ctx.fillStyle = `rgba(0, 0, 0, ${1 - alpha})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // Desenhar efeito de explosão
        if (this.explosionEffect) {
            const timeSinceExplosion = Date.now() - this.explosionEffect.startTime;
            if (timeSinceExplosion < this.explosionEffect.duration) {
                const progress = timeSinceExplosion / this.explosionEffect.duration;
                const radius = this.tileSize * (1 + progress * 3);
                const alpha = 1 - progress;

                // Onda de choque
                const gradient = this.ctx.createRadialGradient(
                    this.explosionEffect.x + this.tileSize/2,
                    this.explosionEffect.y + this.tileSize/2,
                    0,
                    this.explosionEffect.x + this.tileSize/2,
                    this.explosionEffect.y + this.tileSize/2,
                    radius
                );
                gradient.addColorStop(0, `rgba(255, 69, 0, ${alpha})`);
                gradient.addColorStop(0.5, `rgba(255, 0, 0, ${alpha * 0.5})`);
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();
                this.ctx.arc(
                    this.explosionEffect.x + this.tileSize/2,
                    this.explosionEffect.y + this.tileSize/2,
                    radius,
                    0,
                    Math.PI * 2
                );
                this.ctx.fill();

                // Partículas da explosão
                for (let i = 0; i < 12; i++) {
                    const angle = (Math.PI * 2 * i / 12) + progress * Math.PI;
                    const particleRadius = radius * 0.7;
                    const particleX = this.explosionEffect.x + this.tileSize/2 + Math.cos(angle) * particleRadius;
                    const particleY = this.explosionEffect.y + this.tileSize/2 + Math.sin(angle) * particleRadius;

                    this.ctx.fillStyle = `rgba(255, ${Math.floor(165 * (1 - progress))}, 0, ${alpha})`;
                    this.ctx.beginPath();
                    this.ctx.arc(particleX, particleY, this.tileSize/4 * (1 - progress), 0, Math.PI * 2);
                    this.ctx.fill();
                }
            } else {
                this.explosionEffect = null;
            }
        }

        // Desenhar efeito de desaparecimento da bomba
        if (this.despawnEffect) {
            const timeSinceDespawn = Date.now() - this.despawnEffect.startTime;
            if (timeSinceDespawn < this.despawnEffect.duration) {
                const progress = timeSinceDespawn / this.despawnEffect.duration;
                const alpha = 1 - progress;
                const scale = 1 + progress;

                // Efeito de desvanecimento
                this.ctx.globalAlpha = alpha;
                this.drawBomb(
                    this.despawnEffect.x + this.tileSize/2,
                    this.despawnEffect.y + this.tileSize/2
                );
                this.ctx.globalAlpha = 1;

                // Círculo de energia se dissipando
                this.ctx.strokeStyle = `rgba(255, 165, 0, ${alpha})`;
                this.ctx.lineWidth = 2 * (1 - progress);
                this.ctx.beginPath();
                this.ctx.arc(
                    this.despawnEffect.x + this.tileSize/2,
                    this.despawnEffect.y + this.tileSize/2,
                    this.tileSize * scale,
                    0,
                    Math.PI * 2
                );
                this.ctx.stroke();
            } else {
                this.despawnEffect = null;
            }
        }

        // Atualizar e desenhar partículas
        this.updateAndDrawParticles();

        // Desenhar interface de vidas
        this.drawLives();

        // Desenhar rastro se ativo
        if (this.currentStage.trailEffect && this.trailPositions.length > 0) {
            this.trailPositions.forEach((pos, index) => {
                const alpha = 1 - (index / this.trailPositions.length);
                this.ctx.fillStyle = `${this.currentStage.glowColor.slice(0, -4)}, ${alpha})`;
                this.ctx.beginPath();
                this.ctx.arc(
                    pos.x * this.tileSize + this.tileSize/2,
                    pos.y * this.tileSize + this.tileSize/2,
                    this.tileSize/3,
                    0,
                    Math.PI * 2
                );
                this.ctx.fill();
            });
        }

        // Desenhar partículas de evolução
        this.evolutionParticles.forEach(particle => {
            const alpha = particle.life;
            this.ctx.fillStyle = `${particle.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, this.tileSize/4 * particle.life, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    drawSnakeHead(x, y, size, direction) {
        const stage = this.currentStage;
        
        // Desenhar aura na cabeça
        if (stage.energyAura) {
            const auraSize = size * 1.4;
            const auraGradient = this.ctx.createRadialGradient(
                x + size/2, y + size/2, size/2,
                x + size/2, y + size/2, auraSize
            );
            auraGradient.addColorStop(0, stage.glowColor);
            auraGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            this.ctx.fillStyle = auraGradient;
            this.ctx.beginPath();
            this.ctx.arc(x + size/2, y + size/2, auraSize, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Gradiente base da cabeça
        let gradient;
        if (stage.rainbowEffect) {
            gradient = this.ctx.createLinearGradient(x, y, x + size, y + size);
            gradient.addColorStop(0, `hsl(${this.rainbowHue}, 100%, 60%)`);
            gradient.addColorStop(1, `hsl(${this.rainbowHue + 30}, 100%, 50%)`);
        } else {
            gradient = this.ctx.createLinearGradient(x, y, x + size, y + size);
            gradient.addColorStop(0, stage.colors[0]);
            gradient.addColorStop(1, stage.colors[1]);
        }

        // Desenhar cabeça com aparência evoluída
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.ellipse(
            x + size/2,
            y + size/2,
            size/2,
            size/2 * 0.8,
            direction.x ? Math.PI/2 : 0,
            0,
            Math.PI * 2
        );
        this.ctx.fill();

        // Olhos com efeito baseado no estágio
        const eyeSize = size/6;
        const eyeOffset = size/4;
        let eyeX1, eyeY1, eyeX2, eyeY2;
        
        if (direction.x !== 0) {
            eyeX1 = eyeX2 = x + size/2 + (direction.x * eyeOffset);
            eyeY1 = y + size/3;
            eyeY2 = y + size * 2/3;
        } else {
            eyeX1 = x + size/3;
            eyeX2 = x + size * 2/3;
            eyeY1 = eyeY2 = y + size/2 + (direction.y * eyeOffset);
        }

        // Cor dos olhos baseada no estágio
        let eyeColor = '#000';
        if (stage === this.evolutionStages.MASTER) {
            eyeColor = '#ffd700';
        } else if (stage === this.evolutionStages.LEGENDARY) {
            eyeColor = `hsl(${this.rainbowHue}, 100%, 50%)`;
        }

        // Desenhar olhos
        this.ctx.fillStyle = eyeColor;
        this.ctx.beginPath();
        this.ctx.arc(eyeX1, eyeY1, eyeSize, 0, Math.PI * 2);
        this.ctx.arc(eyeX2, eyeY2, eyeSize, 0, Math.PI * 2);
        this.ctx.fill();

        // Brilho nos olhos
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.beginPath();
        this.ctx.arc(eyeX1 - eyeSize/3, eyeY1 - eyeSize/3, eyeSize/4, 0, Math.PI * 2);
        this.ctx.arc(eyeX2 - eyeSize/3, eyeY2 - eyeSize/3, eyeSize/4, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawSnakeBody(x, y, size, index, effectColor, effectIntensity = 0) {
        const stage = this.currentStage;
        
        // Criar gradiente base
        let gradient;
        if (stage.rainbowEffect) {
            const hue = (this.rainbowHue + index * 10) % 360;
            gradient = this.ctx.createLinearGradient(x, y, x + size, y + size);
            gradient.addColorStop(0, `hsl(${hue}, 100%, 60%)`);
            gradient.addColorStop(1, `hsl(${hue + 30}, 100%, 50%)`);
        } else {
            gradient = this.ctx.createLinearGradient(x, y, x + size, y + size);
            gradient.addColorStop(0, stage.colors[0]);
            gradient.addColorStop(1, stage.colors[1]);
        }
        
        // Desenhar aura de energia
        if (stage.energyAura) {
            const auraSize = size * 1.2;
            const auraGradient = this.ctx.createRadialGradient(
                x + size/2, y + size/2, size/2,
                x + size/2, y + size/2, auraSize
            );
            auraGradient.addColorStop(0, stage.glowColor);
            auraGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            this.ctx.fillStyle = auraGradient;
            this.ctx.beginPath();
            this.ctx.arc(x + size/2, y + size/2, auraSize, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Efeito dourado
        if (stage.goldenEffect) {
            const time = Date.now() / 1000;
            const shimmerIntensity = (Math.sin(time * 2 + index * 0.1) + 1) / 2;
            this.ctx.fillStyle = `rgba(255, 215, 0, ${shimmerIntensity * 0.3})`;
            this.ctx.beginPath();
            this.ctx.roundRect(x, y, size, size, 4);
            this.ctx.fill();
        }

        // Desenhar corpo base
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, size, size, 4);
        this.ctx.fill();

        // Desenhar padrão de escamas se ativo
        if (stage.scalePattern) {
            this.drawSnakeScales(x, y, size, index);
        }
    }

    drawSnakeScales(x, y, size, index) {
        const scaleSize = size / 3;
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        
        // Padrão de escamas alternado
        for (let i = 0; i < 3; i++) {
            const offsetX = (index % 2) * (scaleSize / 2);
            this.ctx.beginPath();
            this.ctx.arc(
                x + scaleSize * i + offsetX,
                y + size/2,
                scaleSize/2,
                0,
                Math.PI * 2
            );
            this.ctx.fill();
        }
    }

    drawRoundedRect(x, y, width, height, radius) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + width - radius, y);
        this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.ctx.lineTo(x + width, y + height - radius);
        this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.quadraticCurveTo(x, y, x + radius, y);
        this.ctx.closePath();
    }

    drawBomb(x, y) {
        const bombSize = this.tileSize * 0.8;
        const timeLeft = this.food.createdAt + 5000 - Date.now();
        const blinkRate = Math.min(15, Math.max(5, timeLeft / 1000 * 2));
        const blinkIntensity = ((Date.now() % (blinkRate * 100)) / (blinkRate * 100));
        
        // Sombra pulsante vermelha
        const glowSize = bombSize * (1 + blinkIntensity * 0.3);
        const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, glowSize);
        gradient.addColorStop(0, `rgba(255, 0, 0, ${0.3 * blinkIntensity})`);
        gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(x, y, glowSize, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Corpo da bomba
        this.ctx.fillStyle = '#333';
        this.ctx.beginPath();
        this.ctx.arc(x, y, bombSize/2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Pavio com brilho
        const sparkTime = Date.now() / 100;
        this.ctx.strokeStyle = '#ffa500';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - bombSize/2);
        this.ctx.quadraticCurveTo(
            x + bombSize/3,
            y - bombSize/2,
            x + bombSize/3,
            y - bombSize * 0.8
        );
        this.ctx.stroke();
        
        // Brilho do pavio
        const sparkX = x + bombSize/3 + Math.cos(sparkTime) * 2;
        const sparkY = y - bombSize * 0.8 + Math.sin(sparkTime) * 2;
        const sparkleGradient = this.ctx.createRadialGradient(
            sparkX, sparkY, 0,
            sparkX, sparkY, bombSize/4
        );
        sparkleGradient.addColorStop(0, '#fff');
        sparkleGradient.addColorStop(0.4, '#ffa500');
        sparkleGradient.addColorStop(1, 'rgba(255, 165, 0, 0)');
        this.ctx.fillStyle = sparkleGradient;
        this.ctx.beginPath();
        this.ctx.arc(sparkX, sparkY, bombSize/4, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawSpecialFood(x, y) {
        const size = this.tileSize * 0.8 + this.foodAnimationOffset;
        const time = Date.now() / 1000;
        
        // Efeito de aura dourada girando
        const rays = 12;
        for (let i = 0; i < rays; i++) {
            const angle = (Math.PI * 2 * i / rays) + time;
            const gradient = this.ctx.createLinearGradient(
                x, y,
                x + Math.cos(angle) * size * 1.5,
                y + Math.sin(angle) * size * 1.5
            );
            gradient.addColorStop(0, 'rgba(255, 215, 0, 0.5)');
            gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.arc(x, y, size * 1.5, angle - 0.2, angle + 0.2);
            this.ctx.closePath();
            this.ctx.fill();
        }

        // Estrela dourada (5 pontas)
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(time);
        
        this.ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
            const nextAngle = (Math.PI * 2 * (i + 1)) / 5 - Math.PI / 2;
            
            const outerX = Math.cos(angle) * size;
            const outerY = Math.sin(angle) * size;
            
            const innerX = Math.cos((angle + nextAngle) / 2) * (size * 0.4);
            const innerY = Math.sin((angle + nextAngle) / 2) * (size * 0.4);
            
            if (i === 0) {
                this.ctx.moveTo(outerX, outerY);
            } else {
                this.ctx.lineTo(outerX, outerY);
            }
            this.ctx.lineTo(innerX, innerY);
        }
        this.ctx.closePath();

        // Gradiente radial para a estrela
        const starGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, size);
        starGradient.addColorStop(0, '#fff6a9');
        starGradient.addColorStop(0.5, '#ffd700');
        starGradient.addColorStop(1, '#ffa500');
        
        this.ctx.fillStyle = starGradient;
        this.ctx.fill();
        
        // Brilho central
        const glowGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.5);
        glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        this.ctx.fillStyle = glowGradient;
        this.ctx.fill();
        
        this.ctx.restore();
    }

    drawHeartFood(x, y) {
        const size = this.tileSize * 0.8;
        const pulseSize = Math.sin(Date.now() / 200) * 2;
        const glowSize = size + pulseSize;
        
        // Aura brilhante
        const glowGradient = this.ctx.createRadialGradient(x, y, 0, x, y, glowSize);
        glowGradient.addColorStop(0, 'rgba(255, 105, 180, 0.3)');
        glowGradient.addColorStop(1, 'rgba(255, 105, 180, 0)');
        
        this.ctx.fillStyle = glowGradient;
        this.ctx.beginPath();
        this.ctx.arc(x, y, glowSize, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Desenhar o coração
        this.ctx.save();
        this.ctx.translate(x - size/2, y - size/2);
        this.drawHeart(0, 0, size, true);
        
        // Adicionar brilho pulsante
        const time = Date.now() / 1000;
        this.ctx.globalAlpha = Math.sin(time * 5) * 0.3 + 0.2;
        this.ctx.fillStyle = '#fff';
        this.drawHeart(0, 0, size * 0.8, true);
        this.ctx.restore();
    }

    drawNormalFood(x, y) {
        const size = this.tileSize/2 - 1 + this.foodAnimationOffset;
        
        this.ctx.fillStyle = this.foodColors.normal[this.currentFoodColorIndex];
        this.ctx.beginPath();
        this.ctx.arc(x, y, size, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Brilho interno
        const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, size);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.5, `${this.foodColors.normal[this.currentFoodColorIndex]}80`);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(x, y, size, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawHeart(x, y, size, filled) {
        const color = filled ? this.foodColors.heart : 'rgba(255, 105, 180, 0.3)';
        
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.moveTo(x + size/2, y + size/4);
        this.ctx.bezierCurveTo(
            x + size/2, y,
            x + size, y,
            x + size, y + size/4
        );
        this.ctx.bezierCurveTo(
            x + size, y + size/2,
            x + size/2, y + size,
            x + size/2, y + size
        );
        this.ctx.bezierCurveTo(
            x + size/2, y + size,
            x, y + size/2,
            x, y + size/4
        );
        this.ctx.bezierCurveTo(
            x, y,
            x + size/2, y,
            x + size/2, y + size/4
        );
        
        if (filled) {
            const gradient = this.ctx.createLinearGradient(x, y, x + size, y + size);
            gradient.addColorStop(0, color);
            gradient.addColorStop(1, this.adjustColor(color, -20));
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
            
            // Adicionar brilho
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.fill();
        } else {
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
        this.ctx.restore();
    }

    createExplosionEffect(x, y) {
        this.explosionEffect = {
            x,
            y,
            startTime: Date.now(),
            duration: 500
        };
    }

    createBombDespawnEffect(x, y) {
        this.despawnEffect = {
            x,
            y,
            startTime: Date.now(),
            duration: 300
        };
    }

    createHeartDespawnEffect(x, y) {
        this.despawnEffect = {
            x,
            y,
            startTime: Date.now(),
            duration: 300
        };
    }

    createParticleEffect(x, y) {
        if (!this.particles) this.particles = [];
        
        const numParticles = 10;
        for (let i = 0; i < numParticles; i++) {
            const angle = (Math.PI * 2 * i) / numParticles;
            this.particles.push({
                x,
                y,
                dx: Math.cos(angle) * 5,
                dy: Math.sin(angle) * 5,
                life: 1,
                color: '#66bb6a'
            });
        }
    }

    createSpecialFoodEffect(x, y) {
        // Efeito de explosão dourada
        const particles = 20;
        for (let i = 0; i < particles; i++) {
            const angle = (Math.PI * 2 * i) / particles;
            const speed = 5 + Math.random() * 3;
            this.particles.push({
                x,
                y,
                dx: Math.cos(angle) * speed,
                dy: Math.sin(angle) * speed,
                life: 1,
                color: this.foodColors.special,
                size: this.tileSize/3,
                spin: Math.random() * Math.PI * 2
            });
        }
    }

    createHeartCollectEffect(x, y) {
        // Efeito de coração subindo com rastro
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                this.particles.push({
                    x,
                    y,
                    dx: (Math.random() - 0.5) * 1,
                    dy: -2 - Math.random(),
                    life: 1,
                    color: this.foodColors.heart,
                    isHeart: true,
                    size: this.tileSize/2,
                    delay: i * 100
                });
            }, i * 100);
        }

        // Partículas brilhantes
        for (let i = 0; i < 10; i++) {
            const angle = (Math.PI * 2 * i) / 10;
            this.particles.push({
                x,
                y,
                dx: Math.cos(angle) * 3,
                dy: Math.sin(angle) * 3,
                life: 0.8,
                color: '#ffffff',
                size: this.tileSize/6
            });
        }
    }

    createLifeLostEffect(x, y) {
        // Efeito de coração quebrando
        const particles = 15;
        for (let i = 0; i < particles; i++) {
            const angle = (Math.PI * 2 * i) / particles;
            this.particles.push({
                x,
                y,
                dx: Math.cos(angle) * 3,
                dy: Math.sin(angle) * 3,
                life: 1,
                color: this.foodColors.heart,
                size: this.tileSize/4
            });
        }
    }

    updateAndDrawParticles() {
        this.particles = this.particles.filter(particle => {
            // Atualizar posição
            particle.x += particle.dx;
            particle.y += particle.dy;
            
            // Aplicar gravidade e atrito
            if (!particle.isHeart) {
                particle.dy += 0.2;
                particle.dx *= 0.98;
                particle.dy *= 0.98;
            }
            
            // Atualizar vida
            particle.life -= 0.02;
            
            // Desenhar partícula
            if (particle.life > 0) {
                const alpha = particle.life;
                
                if (particle.isHeart) {
                    // Desenhar partícula de coração
                    this.ctx.save();
                    this.ctx.translate(particle.x + this.tileSize/2, particle.y + this.tileSize/2);
                    this.ctx.scale(particle.life, particle.life);
                    this.drawHeart(-particle.size/2, -particle.size/2, particle.size, true);
                    this.ctx.restore();
                } else {
                    // Desenhar partícula normal com rastro
                    const size = particle.size || (this.tileSize/4 * particle.life);
                    
                    if (particle.spin !== undefined) {
                        // Partícula especial (estrela)
                        this.ctx.save();
                        this.ctx.translate(particle.x + this.tileSize/2, particle.y + this.tileSize/2);
                        this.ctx.rotate(particle.spin += 0.1);
                        this.drawParticleStar(0, 0, size, particle.color, alpha);
                        this.ctx.restore();
                    } else {
                        // Partícula circular normal
                        this.ctx.fillStyle = `${particle.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
                        this.ctx.beginPath();
                        this.ctx.arc(particle.x + this.tileSize/2, particle.y + this.tileSize/2, size, 0, Math.PI * 2);
                        this.ctx.fill();
                    }
                }
                
                return true;
            }
            return false;
        });
    }

    drawParticleStar(x, y, size, color, alpha) {
        this.ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
            const nextAngle = (Math.PI * 2 * (i + 1)) / 5 - Math.PI / 2;
            
            const outerX = Math.cos(angle) * size;
            const outerY = Math.sin(angle) * size;
            
            const innerX = Math.cos((angle + nextAngle) / 2) * (size * 0.4);
            const innerY = Math.sin((angle + nextAngle) / 2) * (size * 0.4);
            
            if (i === 0) {
                this.ctx.moveTo(outerX, outerY);
            } else {
                this.ctx.lineTo(outerX, outerY);
            }
            this.ctx.lineTo(innerX, innerY);
        }
        this.ctx.closePath();
        this.ctx.fillStyle = `${color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
        this.ctx.fill();
    }

    gameLoop(currentTime) {
        if (!this.animationFrameId) return;

        window.requestAnimationFrame(this.gameLoop);

        const secondsSinceLastRender = (currentTime - this.lastRenderTime) / 1000;
        if (secondsSinceLastRender < 1 / (1000 / this.speed)) return;

        this.lastRenderTime = currentTime;
        this.update();
        this.draw();
    }

    startGame() {
        if (this.animationFrameId !== null) return;
        
        // Reset dos efeitos
        this.fadeOutEffect = false;
        this.deathEffect = false;
        this.gameOverElement.style.display = 'none';
        
        // Limpar timers existentes
        this.clearTimers();
        
        // Inicializar estado do jogo
        this.initializeGameState();
        
        // Iniciar loop do jogo
        this.animationFrameId = window.requestAnimationFrame(this.gameLoop);
    }

    gameOver() {
        if (this.animationFrameId !== null) {
            this.fadeOutEffect = true;
            
            setTimeout(() => {
                window.cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = null;
                
                // Atualizar a pontuação final
                this.finalScoreElement.textContent = this.score;
                
                // Adicionar classe para animar a entrada do game over
                this.gameOverElement.style.display = 'block';
                
                // Adicionar efeito de tremor na tela
                const gameContainer = document.querySelector('.game-container');
                gameContainer.style.animation = 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both';
                
                // Limpar a animação após ela terminar
                setTimeout(() => {
                    gameContainer.style.animation = '';
                }, 500);
                
            }, 1000); // Espera 1 segundo para mostrar o efeito de morte
        }
    }

    // Função auxiliar para ajustar cores
    adjustColor(color, amount) {
        const hex = color.replace('#', '');
        const r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount));
        const g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + amount));
        const b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + amount));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    // Função auxiliar para interpolar cores
    interpolateColors(color1, color2, factor) {
        const r1 = parseInt(color1.substring(1, 3), 16);
        const g1 = parseInt(color1.substring(3, 5), 16);
        const b1 = parseInt(color1.substring(5, 7), 16);
        
        const r2 = parseInt(color2.substring(1, 3), 16);
        const g2 = parseInt(color2.substring(3, 5), 16);
        const b2 = parseInt(color2.substring(5, 7), 16);
        
        const r = Math.round(r1 + (r2 - r1) * factor);
        const g = Math.round(g1 + (g2 - g1) * factor);
        const b = Math.round(b1 + (b2 - b1) * factor);
        
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    getFoodColor(type) {
        switch(type) {
            case this.foodTypes.SPECIAL:
                return this.foodColors.special;
            case this.foodTypes.HEART:
                return this.foodColors.heart;
            case this.foodTypes.NORMAL:
                return this.foodColors.normal[this.currentFoodColorIndex];
            default:
                return this.foodColors.normal[0];
        }
    }

    drawLives() {
        // Desenhar fundo escuro semi-transparente para as vidas
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.roundRect(
            this.canvas.width - (this.maxLives * (this.tileSize + 5)) - 15,
            5,
            (this.maxLives * (this.tileSize + 5)) + 10,
            this.tileSize + 10,
            5
        );
        this.ctx.fill();

        const heartSize = this.tileSize * 0.8;
        const padding = 5;
        const startX = this.canvas.width - (this.maxLives * (heartSize + padding)) - 10;
        
        // Desenhar ícone de vida
        const iconSize = this.tileSize * 0.6;
        this.ctx.fillStyle = '#ff69b4';
        this.ctx.font = `${iconSize}px Arial`;
        this.ctx.fillText('♥', startX - iconSize, padding + heartSize * 0.8);
        
        // Desenhar corações
        for (let i = 0; i < this.maxLives; i++) {
            const x = startX + i * (heartSize + padding);
            const y = padding;
            const isFilled = i < this.lives;
            
            // Efeito de pulso para o coração quando ganha vida
            if (isFilled && this.lastLifeGained && i === this.lives - 1) {
                const timeSinceGain = Date.now() - this.lastLifeGained;
                if (timeSinceGain < 500) {
                    const scale = 1 + Math.sin((timeSinceGain / 500) * Math.PI) * 0.3;
                    this.ctx.save();
                    this.ctx.translate(x + heartSize/2, y + heartSize/2);
                    this.ctx.scale(scale, scale);
                    this.drawHeart(-heartSize/2, -heartSize/2, heartSize, isFilled);
                    this.ctx.restore();
                    continue;
                } else {
                    this.lastLifeGained = null;
                }
            }
            
            this.drawHeart(x, y, heartSize, isFilled);
        }
    }

    getCurrentStage() {
        let newStage = this.evolutionStages.BASIC;
        for (const stage of Object.values(this.evolutionStages)) {
            if (this.score >= stage.minScore) {
                newStage = stage;
            }
        }
        return newStage;
    }

    onEvolution(newStage) {
        this.currentStage = newStage;
        
        // Criar efeito de evolução
        this.createEvolutionEffect();
        
        // Notificar o jogador
        const notification = document.createElement('div');
        notification.className = 'evolution-notification';
        notification.textContent = `Evolução: ${newStage.name}!`;
        document.body.appendChild(notification);
        
        // Remover a notificação após 3 segundos
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    createEvolutionEffect() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Criar partículas de evolução
        for (let i = 0; i < 30; i++) {
            const angle = (Math.PI * 2 * i) / 30;
            const speed = 5;
            this.evolutionParticles.push({
                x: centerX,
                y: centerY,
                dx: Math.cos(angle) * speed,
                dy: Math.sin(angle) * speed,
                life: 1,
                color: this.currentStage.colors[0]
            });
        }
    }

    updateEvolutionEffects() {
        // Atualizar partículas de evolução
        this.evolutionParticles = this.evolutionParticles.filter(particle => {
            particle.x += particle.dx;
            particle.y += particle.dy;
            particle.life -= 0.02;
            return particle.life > 0;
        });

        // Atualizar posições do rastro
        if (this.currentStage.trailEffect) {
            this.trailPositions.unshift({ x: this.snake[0].x, y: this.snake[0].y });
            if (this.trailPositions.length > 5) {
                this.trailPositions.pop();
            }
        }

        // Atualizar efeito rainbow
        if (this.currentStage.rainbowEffect) {
            this.rainbowHue = (this.rainbowHue + 1) % 360;
        }
    }
}

// Inicializar o jogo
new SnakeGame();