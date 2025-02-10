class SnakeGame {
    constructor() {
        // Inicialização do canvas e contexto
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Configurações do jogo
        this.foodColors = [
            '#ff4444', // vermelho
            '#4444ff', // azul
            '#44ff44', // verde
            '#ff44ff', // rosa
            '#ffff44', // amarelo
            '#44ffff', // ciano
            '#ff8844', // laranja
            '#8844ff'  // roxo
        ];
        this.currentFoodColorIndex = 0;
        
        // Ajustar o tamanho do canvas
        const size = Math.min(400, Math.min(window.innerWidth - 40, window.innerHeight - 200));
        this.canvas.width = size;
        this.canvas.height = size;
        this.tileSize = size / 20;
        
        // Inicializar cobra no centro
        const centerTile = Math.floor((size / this.tileSize) / 2);
        this.snake = [
            {x: centerTile, y: centerTile},
            {x: centerTile - 1, y: centerTile},
            {x: centerTile - 2, y: centerTile}
        ];
        
        // Inicializar outras propriedades do jogo
        this.direction = {x: 1, y: 0};
        this.nextDirection = {x: 1, y: 0};
        this.score = 0;
        this.speed = 150;
        this.food = this.generateFood(); // Agora snake já está definido quando generateFood é chamado
        
        // Estado do jogo e animações
        this.animationFrameId = null;
        this.lastRenderTime = 0;
        this.wrapEffect = false;
        this.wrapEffectTime = 0;
        this.wrapPortals = [];
        this.deathEffect = false;
        this.deathEffectTime = 0;
        this.deathPosition = null;
        this.fadeOutEffect = false;
        this.foodEatenEffect = null;
        this.effectDuration = 500;
        
        // Elementos da UI
        this.gameOverElement = document.getElementById('gameOver');
        this.finalScoreElement = document.getElementById('finalScore');
        document.getElementById('restartButton').addEventListener('click', () => this.startGame());
        
        // Bind do gameLoop e setup de eventos
        this.gameLoop = this.gameLoop.bind(this);
        this.setupEventListeners();
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // Desenhar estado inicial
        this.draw();
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
        do {
            newFood = {
                x: Math.floor(Math.random() * (this.canvas.width / this.tileSize)),
                y: Math.floor(Math.random() * (this.canvas.height / this.tileSize))
            };
        } while (this.snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
        
        // Mudar a cor da comida
        this.currentFoodColorIndex = (this.currentFoodColorIndex + 1) % this.foodColors.length;
        
        return newFood;
    }

    setupEventListeners() {
        document.addEventListener('keydown', this.handleKeyPress.bind(this));
        document.getElementById('startButton').addEventListener('click', this.startGame.bind(this));
        
        // Mobile controls
        document.getElementById('upButton').addEventListener('click', () => this.setDirection(0, -1));
        document.getElementById('downButton').addEventListener('click', () => this.setDirection(0, 1));
        document.getElementById('leftButton').addEventListener('click', () => this.setDirection(-1, 0));
        document.getElementById('rightButton').addEventListener('click', () => this.setDirection(1, 0));
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

        // Wall collision - game over with visual effect
        const maxX = Math.floor(this.canvas.width / this.tileSize);
        const maxY = Math.floor(this.canvas.height / this.tileSize);

        // Verifica colisão com as paredes
        if (head.x < 0 || head.x >= maxX || head.y < 0 || head.y >= maxY) {
            this.deathEffect = true;
            this.deathEffectTime = Date.now();
            this.deathPosition = {
                x: head.x < 0 ? 0 : head.x >= maxX ? (maxX - 1) * this.tileSize : head.x * this.tileSize,
                y: head.y < 0 ? 0 : head.y >= maxY ? (maxY - 1) * this.tileSize : head.y * this.tileSize
            };
            
            // Adicionar shake imediatamente
            const gameContainer = document.querySelector('.game-container');
            gameContainer.style.animation = 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both';
            setTimeout(() => {
                gameContainer.style.animation = '';
            }, 500);
            
            this.gameOver();
            return;
        }

        // Self collision check - ignorar a última parte da cauda pois ela vai se mover
        const collisionCheck = this.snake.slice(0, -1).some(segment => 
            segment.x === head.x && segment.y === head.y
        );

        if (collisionCheck) {
            this.deathEffect = true;
            this.deathEffectTime = Date.now();
            this.deathPosition = {
                x: head.x * this.tileSize,
                y: head.y * this.tileSize
            };
            
            // Adicionar shake imediatamente
            const gameContainer = document.querySelector('.game-container');
            gameContainer.style.animation = 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both';
            setTimeout(() => {
                gameContainer.style.animation = '';
            }, 500);
            
            this.gameOver();
            return;
        }

        // Add new head
        this.snake.unshift(head);

        // Food collision check
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 10;
            document.getElementById('score').textContent = this.score;
            
            // Criar efeito de comida passando pela cobra
            this.foodEatenEffect = {
                color: this.foodColors[this.currentFoodColorIndex],
                position: 0,
                startTime: Date.now()
            };
            
            this.food = this.generateFood();
            this.speed = Math.max(50, 150 - Math.floor(this.score / 50) * 10);
        } else {
            this.snake.pop();
        }

        // Atualizar posição do efeito de comida com transição mais suave
        if (this.foodEatenEffect) {
            const timeSinceEaten = Date.now() - this.foodEatenEffect.startTime;
            // Calcular a posição com base no tempo, permitindo valores decimais para suavidade
            this.foodEatenEffect.position = (timeSinceEaten / this.effectDuration) * this.snake.length;
            
            if (timeSinceEaten >= this.effectDuration) {
                this.foodEatenEffect = null;
            }
        }
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

        // Desenhar comida com a cor atual
        const foodX = (this.food.x * this.tileSize) + this.tileSize/2;
        const foodY = (this.food.y * this.tileSize) + this.tileSize/2;
        
        // Efeito de brilho pulsante
        const pulseSize = Math.sin(Date.now() / 200) * 2;
        
        // Glow effect
        this.ctx.shadowColor = this.foodColors[this.currentFoodColorIndex];
        this.ctx.shadowBlur = 15;
        
        // Desenhar comida
        this.ctx.fillStyle = this.foodColors[this.currentFoodColorIndex];
        this.ctx.beginPath();
        this.ctx.arc(foodX, foodY, (this.tileSize/2 - 1) + pulseSize, 0, Math.PI * 2);
        this.ctx.fill();

        // Brilho interno
        const gradient = this.ctx.createRadialGradient(
            foodX, foodY, 0,
            foodX, foodY, this.tileSize/2
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.5, `${this.foodColors[this.currentFoodColorIndex]}80`);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(foodX, foodY, this.tileSize/2 + pulseSize, 0, Math.PI * 2);
        this.ctx.fill();

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
    }

    drawSnakeHead(x, y, size, direction) {
        const gradient = this.ctx.createLinearGradient(x, y, x + size, y + size);
        gradient.addColorStop(0, '#7cb342');
        gradient.addColorStop(1, '#558b2f');
        this.ctx.fillStyle = gradient;

        // Desenhar cabeça oval
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

        // Olhos com brilho
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

        // Base dos olhos
        this.ctx.fillStyle = '#000';
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
        // Gradiente para o corpo com transição suave entre cores
        const gradient = this.ctx.createLinearGradient(x, y, x + size, y + size);
        
        if (effectColor && effectIntensity > 0) {
            const baseColor1 = '#66bb6a';
            const baseColor2 = '#43a047';
            
            const interpolatedColor1 = this.interpolateColors(baseColor1, effectColor, effectIntensity);
            const interpolatedColor2 = this.interpolateColors(baseColor2, this.adjustColor(effectColor, -20), effectIntensity);
            
            gradient.addColorStop(0, interpolatedColor1);
            gradient.addColorStop(1, interpolatedColor2);
        } else {
            gradient.addColorStop(0, '#66bb6a');
            gradient.addColorStop(1, '#43a047');
        }
        
        this.ctx.fillStyle = gradient;

        // Corpo suavemente arredondado com ondulação
        const waveIntensity = effectIntensity > 0 ? 3 : 2; // Aumenta a ondulação durante o efeito
        const offset = Math.sin(Date.now() / 200 + index) * waveIntensity;
        
        this.ctx.beginPath();
        this.ctx.roundRect(
            x + offset/2,
            y,
            size - offset,
            size,
            4
        );
        this.ctx.fill();

        // Padrão de escamas mais elaborado
        const scaleSize = size/3;
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.lineWidth = 1;
        
        // Padrão de diamante para as escamas
        const offsetY = (index % 2) * scaleSize/2;
        for (let i = -scaleSize; i < size + scaleSize; i += scaleSize) {
            for (let j = -scaleSize; j < size + scaleSize; j += scaleSize) {
                this.ctx.beginPath();
                this.ctx.moveTo(x + i + scaleSize/2, y + j + offsetY);
                this.ctx.lineTo(x + i + scaleSize, y + j + scaleSize/2 + offsetY);
                this.ctx.lineTo(x + i + scaleSize/2, y + j + scaleSize + offsetY);
                this.ctx.lineTo(x + i, y + j + scaleSize/2 + offsetY);
                this.ctx.closePath();
                this.ctx.stroke();

                // Adicionar brilho sutil às escamas
                const scaleGradient = this.ctx.createRadialGradient(
                    x + i + scaleSize/2,
                    y + j + scaleSize/2 + offsetY,
                    0,
                    x + i + scaleSize/2,
                    y + j + scaleSize/2 + offsetY,
                    scaleSize/2
                );
                scaleGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
                scaleGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                this.ctx.fillStyle = scaleGradient;
                this.ctx.fill();
            }
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

    gameLoop(currentTime) {
        if (this.animationFrameId === null) return;

        // Remove o bind aqui pois já foi feito no constructor
        window.requestAnimationFrame(this.gameLoop);

        // Controle de FPS baseado no tempo decorrido
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
        
        const centerTile = Math.floor((this.canvas.width / this.tileSize) / 2);
        // Aumentar o tamanho inicial da cobra
        this.snake = [
            {x: centerTile, y: centerTile},
            {x: centerTile - 1, y: centerTile},
            {x: centerTile - 2, y: centerTile},
            {x: centerTile - 3, y: centerTile},
            {x: centerTile - 4, y: centerTile}
        ];
        
        this.direction = {x: 1, y: 0};
        this.nextDirection = {x: 1, y: 0};
        this.score = 0;
        document.getElementById('score').textContent = '0';
        this.food = this.generateFood();
        this.speed = 150;
        this.lastRenderTime = 0;
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
}

// Inicializar o jogo
new SnakeGame();