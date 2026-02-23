// =============================================================================
// AR TOY EXTRACTOR: MISSÃO DE COLETA (OBJ DETECTION + GPS TRACKING)
// ZERO TOQUES - 100% AUTOMATIZADO PELO MOVIMENTO DO CAMINHÃO
// =============================================================================

(function() {
    "use strict";

    let particles = [];
    let time = 0;

    const Game = {
        state: 'LOADING', // LOADING, AUTO_CALIBRATE, SEARCHING, RETURNING
        score: 0,
        
        // IA Visual (COCO-SSD)
        objectModel: null,
        detectedItems: [],
        lastDetectTime: 0,
        
        // Mecânica de Captura (Zero Touch)
        scanProgress: 0,
        targetInSight: null,
        cooldown: 0,
        
        // Inventário
        cargo: null, 
        itemsCollected: 0,

        // GPS e Navegação
        basePos: { lat: null, lng: null },
        currentPos: { lat: null, lng: null },
        distanceToBase: 999,
        gpsWatcher: null,
        compassHeading: 0,
        
        // Timer de calibração automática
        timer: 150, // Aprox 3 segundos

        init: function(faseData) {
            this.state = 'LOADING';
            this.score = 0;
            this.cargo = null;
            this.itemsCollected = 0;
            this.scanProgress = 0;
            this.cooldown = 0;
            this.timer = 150;
            particles = [];
            time = 0;
            
            window.System.msg("INICIANDO SENSORES...");
            this.startSensors();
            this.loadAIModel();
        },

        startSensors: function() {
            // Liga a bússola para ajudar na navegação de volta para a base
            window.addEventListener('deviceorientation', (event) => {
                this.compassHeading = event.alpha || 0;
            });
        },

        loadAIModel: async function() {
            // Injeta a IA de reconhecimento de objetos no jogo dinamicamente
            if (typeof cocoSsd === 'undefined') {
                const script = document.createElement('script');
                script.src = "https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd";
                document.head.appendChild(script);
                
                script.onload = async () => {
                    this.objectModel = await cocoSsd.load();
                    this.state = 'AUTO_CALIBRATE';
                    if(window.Sfx) window.Sfx.play(600, 'square', 0.5, 0.2);
                };
            } else {
                this.objectModel = await cocoSsd.load();
                this.state = 'AUTO_CALIBRATE';
            }
        },

        // Função de GPS
        setupGPS: function() {
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition((pos) => {
                    this.basePos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    this.currentPos = { ...this.basePos };
                    
                    this.gpsWatcher = navigator.geolocation.watchPosition((newPos) => {
                        this.currentPos.lat = newPos.coords.latitude;
                        this.currentPos.lng = newPos.coords.longitude;
                        this.distanceToBase = this.calculateDistance(this.basePos.lat, this.basePos.lng, this.currentPos.lat, this.currentPos.lng);
                    }, null, { enableHighAccuracy: true });
                }, () => {
                    // Se falhar, cria uma base falsa para o jogo continuar funcionando
                    this.basePos = { lat: 0, lng: 0 };
                    this.currentPos = { lat: 0, lng: 0 };
                    this.distanceToBase = 0;
                });
            }
        },

        calculateDistance: function(lat1, lon1, lat2, lon2) {
            const R = 6371e3;
            const p1 = lat1 * Math.PI/180; const p2 = lat2 * Math.PI/180;
            const dp = (lat2-lat1) * Math.PI/180; const dl = (lon2-lon1) * Math.PI/180;
            const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); // Retorna Metros
        },

        update: function(ctx, w, h, pose) {
            time += 0.05;

            // 1. DESENHA A CÂMERA DE FUNDO
            if (window.System.video && window.System.video.readyState === 4) {
                const videoRatio = window.System.video.videoWidth / window.System.video.videoHeight;
                const canvasRatio = w / h;
                let drawW = w, drawH = h, drawX = 0, drawY = 0;
                if (videoRatio > canvasRatio) { drawW = h * videoRatio; drawX = (w - drawW) / 2; } 
                else { drawH = w / videoRatio; drawY = (h - drawH) / 2; }
                ctx.drawImage(window.System.video, drawX, drawY, drawW, drawH);
            } else {
                ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, w, h);
            }

            // CONTROLE DE ESTADOS (100% AUTOMÁTICO)
            if (this.state === 'LOADING') {
                this.drawOverlay(ctx, w, h, "BAIXANDO IA VISUAL...", "Conectando ao banco de dados global");
                return this.score;
            }

            if (this.state === 'AUTO_CALIBRATE') {
                this.timer--;
                this.drawOverlay(ctx, w, h, "MARCANDO DEPÓSITO", `Fique parado. Calibrando GPS em ${Math.ceil(this.timer/50)}s...`);
                
                // Desenha radar de calibração
                ctx.strokeStyle = "#0ff"; ctx.lineWidth = 4;
                ctx.beginPath(); ctx.arc(w/2, h/2, 100 + Math.sin(time*5)*20, 0, Math.PI*2); ctx.stroke();

                if (this.timer <= 0) {
                    this.setupGPS();
                    this.state = 'SEARCHING';
                    if(window.Sfx) window.Sfx.epic();
                    window.System.msg("INICIAR BUSCA!");
                }
                return this.score;
            }

            this.playMode(ctx, w, h);
            return this.score;
        },

        drawOverlay: function(ctx, w, h, title, sub) {
            ctx.fillStyle = "rgba(0, 20, 40, 0.85)"; ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = "#0ff"; ctx.textAlign = "center";
            ctx.font = "bold clamp(24px, 6vw, 40px) 'Russo One'";
            ctx.shadowColor = "#0ff"; ctx.shadowBlur = 10;
            ctx.fillText(title, w/2, h/2 - 20);
            ctx.shadowBlur = 0;
            ctx.fillStyle = "#fff"; ctx.font = "clamp(12px, 3vw, 20px) 'Chakra Petch'";
            ctx.fillText(sub, w/2, h/2 + 30);
        },

        playMode: function(ctx, w, h) {
            const cx = w / 2;
            const cy = h / 2;
            let lockedItem = null;

            if (this.cooldown > 0) this.cooldown--;

            // ==========================================
            // LÓGICA DE DETECÇÃO CONTÍNUA DE OBJETOS
            // ==========================================
            if (this.objectModel && window.System.video && window.System.video.readyState === 4) {
                
                // Roda a detecção a cada 300ms para não travar o celular
                if (Date.now() - this.lastDetectTime > 300) {
                    this.objectModel.detect(window.System.video).then(predictions => {
                        this.detectedItems = predictions;
                    });
                    this.lastDetectTime = Date.now();
                }

                // Desenha a Interface e os Alvos
                const scaleX = w / window.System.video.videoWidth;
                const scaleY = h / window.System.video.videoHeight;

                this.detectedItems.forEach(item => {
                    // Ignoramos apenas se ele achar que é uma "pessoa" (porque pessoas não são carga)
                    if (item.class === 'person' || item.score < 0.4) return;

                    const boxX = item.bbox[0] * scaleX;
                    const boxY = item.bbox[1] * scaleY;
                    const boxW = item.bbox[2] * scaleX;
                    const boxH = item.bbox[3] * scaleY;
                    const itemCx = boxX + (boxW/2);
                    const itemCy = boxY + (boxH/2);

                    // Só processa se a caçamba estiver vazia
                    if (this.state === 'SEARCHING') {
                        // Desenha as caixas cibernéticas em TODOS os objetos encontrados
                        this.drawHologramBox(ctx, boxX, boxY, boxW, boxH, item.class.toUpperCase());

                        // Se o objeto estiver na mira do caminhão (centro da tela)
                        const distToCenter = Math.hypot(itemCx - cx, itemCy - cy);
                        
                        // Trava a mira se o objeto for grande o suficiente e estiver centralizado
                        if (distToCenter < 120 && boxW > 60 && this.cooldown <= 0) {
                            lockedItem = item;
                        }
                    }
                });
            }

            // ==========================================
            // LÓGICA DE EXTRAÇÃO (RAIO TRATOR AUTOMÁTICO)
            // ==========================================
            if (lockedItem) {
                this.scanProgress += 2.5;
                if (this.scanProgress % 10 === 0 && window.Sfx) window.Sfx.hover();

                // Desenha o Laser de Extração ligando o caminhão ao objeto
                const itemCx = (lockedItem.bbox[0] + lockedItem.bbox[2]/2) * (w / window.System.video.videoWidth);
                const itemCy = (lockedItem.bbox[1] + lockedItem.bbox[3]/2) * (h / window.System.video.videoHeight);
                
                ctx.strokeStyle = "rgba(0, 255, 255, 0.8)";
                ctx.lineWidth = 10 + Math.random()*10; // Laser vibrando
                ctx.beginPath(); ctx.moveTo(cx, h); ctx.lineTo(itemCx, itemCy); ctx.stroke();
                
                // Brilho no alvo
                ctx.fillStyle = "rgba(0, 255, 255, 0.4)";
                ctx.beginPath(); ctx.arc(itemCx, itemCy, this.scanProgress, 0, Math.PI*2); ctx.fill();

                // CAPTURADO!
                if (this.scanProgress >= 100) {
                    this.cargo = lockedItem.class.toUpperCase();
                    this.state = 'RETURNING';
                    this.scanProgress = 0;
                    if(window.Gfx) window.Gfx.shakeScreen(15);
                    if(window.Sfx) window.Sfx.coin();
                    window.System.msg("OBJETO EXTRAÍDO!");
                    this.spawnParticles(itemCx, itemCy, "#0ff");
                }
            } else {
                this.scanProgress = Math.max(0, this.scanProgress - 1.5);
            }

            // ==========================================
            // LÓGICA DE RETORNO (GPS / AUTO-DESCARREGAMENTO)
            // ==========================================
            if (this.state === 'RETURNING') {
                // Se a distância for menor que 4 metros (margem de erro do GPS)
                // OU se o GPS falhou (distância = 0) e ele já tem a carga, simulamos a entrega após um tempinho
                this.timer--; // Reutilizamos o timer para forçar a entrega se o GPS ficar bugado dentro de casa

                if ((this.distanceToBase > 0 && this.distanceToBase < 4.0) || this.timer <= -300) {
                    // DESCARREGA AUTOMATICAMENTE
                    this.cargo = null;
                    this.state = 'SEARCHING';
                    this.itemsCollected++;
                    this.score += 300;
                    this.cooldown = 100; // Esfria o laser antes de pegar outro
                    this.timer = 0; // reseta timer de segurança
                    
                    if(window.Gfx) window.Gfx.shakeScreen(20);
                    if(window.Sfx) window.Sfx.epic();
                    window.System.msg("ENTREGA CONCLUÍDA!");
                    this.spawnParticles(cx, h - 100, "#2ecc71");

                    if (this.itemsCollected >= 5) {
                        setTimeout(() => window.System.gameOver(this.score, true, 100), 2000);
                    }
                }
            } else {
                this.timer = 0; // Reseta o timer de segurança
            }

            // DESENHA O HUD PRINCIPAL
            this.drawHUD(ctx, w, h, cx, cy, lockedItem !== null);
            this.updateParticles(ctx);
        },

        drawHologramBox: function(ctx, x, y, bw, bh, label) {
            ctx.strokeStyle = "#0ff"; ctx.lineWidth = 2;
            const l = 20; // tamanho das quinas
            
            ctx.beginPath();
            // Top-Left
            ctx.moveTo(x, y+l); ctx.lineTo(x, y); ctx.lineTo(x+l, y);
            // Top-Right
            ctx.moveTo(x+bw-l, y); ctx.lineTo(x+bw, y); ctx.lineTo(x+bw, y+l);
            // Bottom-Right
            ctx.moveTo(x+bw, y+bh-l); ctx.lineTo(x+bw, y+bh); ctx.lineTo(x+bw-l, y+bh);
            // Bottom-Left
            ctx.moveTo(x+l, y+bh); ctx.lineTo(x, y+bh); ctx.lineTo(x, y+bh-l);
            ctx.stroke();

            // Rótulo da IA (Nome do Objeto)
            ctx.fillStyle = "rgba(0, 255, 255, 0.7)";
            ctx.fillRect(x, y - 20, ctx.measureText(label).width + 10, 20);
            ctx.fillStyle = "#000"; ctx.font = "12px 'Chakra Petch'"; ctx.textAlign="left";
            ctx.fillText(label, x + 5, y - 6);
        },

        drawHUD: function(ctx, w, h, cx, cy, isLocking) {
            // Efeito visual de vidro/capacete
            ctx.strokeStyle = "rgba(0, 255, 255, 0.2)"; ctx.lineWidth = 1;
            ctx.strokeRect(20, 20, w-40, h-40);

            // 1. MIRA E PROGRESSO (Apenas modo busca)
            if (this.state === 'SEARCHING') {
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(time * 0.5);
                ctx.strokeStyle = isLocking ? "#f00" : "rgba(0, 255, 255, 0.6)";
                ctx.lineWidth = 2; ctx.setLineDash([20, 15]);
                ctx.beginPath(); ctx.arc(0, 0, 100, 0, Math.PI*2); ctx.stroke();
                
                ctx.rotate(-time); ctx.setLineDash([40, 20]);
                ctx.beginPath(); ctx.arc(0, 0, 70, 0, Math.PI*2); ctx.stroke();
                ctx.restore();
                
                // Barra de travamento
                if (this.scanProgress > 0) {
                    ctx.fillStyle = "rgba(0, 0, 0, 0.6)"; ctx.fillRect(cx - 100, cy + 130, 200, 15);
                    ctx.fillStyle = "#0ff"; ctx.fillRect(cx - 100, cy + 130, this.scanProgress * 2, 15);
                    ctx.strokeStyle = "#fff"; ctx.strokeRect(cx - 100, cy + 130, 200, 15);
                    ctx.fillStyle = "#fff"; ctx.font = "bold 14px Arial"; ctx.textAlign="center";
                    ctx.fillText("EXTRAINDO MATÉRIA...", cx, cy + 165);
                }
            }

            // 2. TELA INFERIOR DO CAMINHÃO (Painel)
            ctx.fillStyle = "rgba(0, 10, 20, 0.85)"; ctx.fillRect(0, h - 100, w, 100);
            ctx.strokeStyle = "#0ff"; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(0, h - 100); ctx.lineTo(w, h - 100); ctx.stroke();

            ctx.textAlign = "left";
            ctx.fillStyle = "#0ff"; ctx.font = "bold 18px 'Russo One'";
            
            if (this.state === 'SEARCHING') {
                ctx.fillText(`ENTREGAS: ${this.itemsCollected}/5`, 20, h - 60);
                ctx.fillStyle = "#ccc"; ctx.font = "14px 'Chakra Petch'";
                ctx.fillText(">> ESCANEANDO OBJETOS...", 20, h - 35);
            } else if (this.state === 'RETURNING') {
                ctx.fillStyle = "#2ecc71";
                ctx.fillText(`CARRGA: ${this.cargo}`, 20, h - 60);
                
                // Distância GPS
                ctx.fillStyle = "#fff"; ctx.font = "16px 'Chakra Petch'";
                let distText = this.distanceToBase > 0 ? `${this.distanceToBase.toFixed(1)}m` : "CALCULANDO...";
                ctx.fillText(`DIST. BASE: ${distText}`, 20, h - 35);
                
                // Texto gigante de aviso
                ctx.textAlign = "center"; ctx.fillStyle = "#2ecc71";
                ctx.font = "bold clamp(20px, 5vw, 30px) 'Russo One'";
                ctx.fillText("VOLTE PARA A BASE!", w/2, cy - 100);

                // BÚSSOLA GUIADORA (Aponta pro GPS)
                this.drawCompass(ctx, w - 80, h - 50, this.distanceToBase);
            }
        },

        drawCompass: function(ctx, x, y, dist) {
            ctx.save();
            ctx.translate(x, y);
            // Fundo da bússola
            ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.strokeStyle = "#2ecc71"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, 0, 35, 0, Math.PI*2); ctx.fill(); ctx.stroke();
            
            // Gira a seta baseado na direção do celular (bússola real)
            ctx.rotate(this.compassHeading * (Math.PI / 180));
            
            // Desenha a seta
            ctx.fillStyle = "#2ecc71";
            ctx.beginPath(); ctx.moveTo(0, -25); ctx.lineTo(15, 10); ctx.lineTo(-15, 10); ctx.fill();
            
            ctx.restore();
        },

        spawnParticles: function(x, y, color) {
            for(let i=0; i<40; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 20 + 5;
                particles.push({
                    x: x, y: y,
                    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                    life: 1.0, size: Math.random() * 8 + 3, color: color
                });
            }
        },

        updateParticles: function(ctx) {
            ctx.globalCompositeOperation = 'lighter';
            particles.forEach(p => {
                p.x += p.vx; p.y += p.vy; 
                p.life -= 0.03; p.size *= 0.95;
                ctx.fillStyle = p.color;
                ctx.globalAlpha = Math.max(0, p.life);
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
            });
            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = 'source-over';
            particles = particles.filter(p => p.life > 0);
        },

        cleanup: function() {
            if (this.gpsWatcher !== null) navigator.geolocation.clearWatch(this.gpsWatcher);
        }
    };

    const regLoop = setInterval(() => {
        if(window.System && window.System.registerGame) {
            window.System.registerGame('ar_collector', 'Extrator AR', '🚛', Game, {
                camera: 'environment', // Exige câmera traseira
                phases: [
                    { id: 'f1', name: 'LIMPEZA DO QUARTO', desc: 'Pilote, encontre os objetos e descarregue-os na base autônoma.', reqLvl: 1 }
                ]
            });
            clearInterval(regLoop);
        }
    }, 100);

})();