    // Fireworks bằng canvas - chạy mượt, configurable
    const canvas = document.getElementById('c');
    const ctx = canvas.getContext('2d');
    let W = canvas.width = innerWidth;
    let H = canvas.height = innerHeight;

    // cấu hình (thay đổi nếu muốn)
    const CONFIG = {
      rocketSpawnRate: 0.75,   // xác suất spawn rocket mỗi frame (0..1)
      rocketSpeedMin: 6,
      rocketSpeedMax: 12,
      gravity: 0.08,
      particleFriction: 0.985,
      particleGravity: 0.04,
      particleCountMin: 60,
      particleCountMax: 100,
      maxRockets: 10,
      maxParticles: 1200
    };

    // helpers
    function rand(min, max) { return Math.random() * (max - min) + min; }
    function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
    function hueToColor(h, alpha=1) { return `hsla(${h},100%,60%,${alpha})`; }

    // trạng thái
    let rockets = [];
    let particles = [];

    // Rocket (bắn từ dưới lên)
    class Rocket {
      constructor(x) {
        this.x = x ?? rand(100, W-100);
        this.y = H + 10; // bắt đầu ngoài màn hình dưới
        this.vx = rand(-1.5, 1.5);
        this.vy = -rand(CONFIG.rocketSpeedMin, CONFIG.rocketSpeedMax);
        this.size = rand(2,3);
        this.hue = randInt(0,360);
        this.age = 0;
        this.boomHeight = rand(H*0.15, H*0.5);
      }
      update() {
        this.vy += CONFIG.gravity;
        this.x += this.vx;
        this.y += this.vy;
        this.age++;
      }
      shouldExplode() {
        // nổ khi đạt chiều cao, hoặc khi vy > 0 (bắt đầu rơi), hoặc ngẫu nhiên
        return this.y <= this.boomHeight || this.vy > 0 || Math.random() < 0.004;
      }
      draw(ctx) {
        ctx.beginPath();
        const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 20);
        grad.addColorStop(0, hueToColor(this.hue, 1));
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(this.x - this.size, this.y - this.size, this.size*2, this.size*2);
      }
    }

    // Particle (sau khi nổ)
    class Particle {
      constructor(x,y,hue) {
        const speed = rand(1, rand(2,8));
        const angle = rand(0, Math.PI*2);
        this.x = x; this.y = y;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        // thêm một ít radial burst để tạo nhiều đường
        if (Math.random() < 0.15) {
          // tạo một "đường": tăng speed và keep direction
          this.vx *= rand(1.5, 3);
          this.vy *= rand(1.5, 3);
        }
        this.size = rand(1,2.8);
        this.hue = (hue + randInt(-40,40) + 360) % 360;
        this.alpha = 1;
        this.life = randInt(50, 140);
        this.age = 0;
      }
      update() {
        this.vx *= CONFIG.particleFriction;
        this.vy *= CONFIG.particleFriction;
        this.vy += CONFIG.particleGravity;
        this.x += this.vx;
        this.y += this.vy;
        this.age++;
        this.alpha = Math.max(0, 1 - this.age / this.life);
      }
      draw(ctx) {
        ctx.beginPath();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = hueToColor(this.hue, Math.min(this.alpha, 1));
        ctx.fillRect(this.x - this.size, this.y - this.size, this.size*2, this.size*2);
        ctx.globalCompositeOperation = 'source-over';
      }
      isDead() { return this.age > this.life || this.alpha <= 0; }
    }

    // spawn rocket
    function spawnRocket(x) {
      if (rockets.length < CONFIG.maxRockets) rockets.push(new Rocket(x));
    }

    // explode rocket
    function explode(rocket) {
      const count = randInt(CONFIG.particleCountMin, CONFIG.particleCountMax);
      const baseHue = rocket.hue;
      for (let i=0;i<count;i++) {
        if (particles.length >= CONFIG.maxParticles) break;
        particles.push(new Particle(rocket.x, rocket.y, baseHue));
      }
    }

    // animation loop
    let last = 0;
    function loop(ts) {
      requestAnimationFrame(loop);
      // clear with slight trail
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(0,0,W,H);

      // spawn some rockets automatically
      if (Math.random() < CONFIG.rocketSpawnRate) spawnRocket(rand(60, W-60));

      // update/draw rockets
      for (let i = rockets.length -1; i >=0; i--) {
        const r = rockets[i];
        r.update();
        r.draw(ctx);
        // small trail
        ctx.beginPath();
        ctx.fillStyle = hueToColor(r.hue, 0.6);
        ctx.fillRect(r.x-1, r.y+2, 2, 6);

        if (r.shouldExplode() || r.y < 30 || r.x < -50 || r.x > W+50) {
          explode(r);
          rockets.splice(i,1);
        }
      }

      // update/draw particles
      for (let i = particles.length -1; i >=0; i--) {
        const p = particles[i];
        p.update();
        p.draw(ctx);
        if (p.isDead() || p.y > H+100 || p.x < -200 || p.x > W+200) particles.splice(i,1);
      }
    }

    // resize handler
    addEventListener('resize', ()=>{
      W = canvas.width = innerWidth; H = canvas.height = innerHeight;
    });

    // click to fire at pointer
    addEventListener('pointerdown', (e)=>{
      spawnRocket(e.clientX);
      // spawn a few for drama
      for (let i=0;i<2;i++) spawnRocket(e.clientX + rand(-30,30));
    });

    // keyboard: press space to burst random
    addEventListener('keydown', (e)=>{
      if (e.code === 'Space') {
        spawnRocket(rand(100, W-100));
      }
    });

    // start
    requestAnimationFrame(loop);


// target date
const targetDate = new Date("2026-01-01T00:00:00").getTime();
const countdownEl = document.getElementById("countdown");

function updateCountdown() {
  const now = new Date().getTime();
  let diff = targetDate - now;

  if (diff <= 0) {
    countdownEl.textContent = "🎉 Happy New Year! 🎉";
    clearInterval(interval);
    return;
  }

  const days = Math.floor(diff / (1000*60*60*24));
  diff %= (1000*60*60*24);
  const hours = Math.floor(diff / (1000*60*60));
  diff %= (1000*60*60);
  const minutes = Math.floor(diff / (1000*60));
  const seconds = Math.floor((diff % (1000*60))/1000);

  countdownEl.textContent =
    `${days}d ${hours.toString().padStart(2,'0')}h:${minutes.toString().padStart(2,'0')}m:${seconds.toString().padStart(2,'0')}s`;
}

// chạy ngay và update mỗi giây
updateCountdown();
const interval = setInterval(updateCountdown, 1000);
    

const stickers = ["lixi.png", "tien.png", "hoamai.png"];
function spawnSticker() {
  const img = document.createElement("img");
  img.src = stickers[Math.floor(Math.random()*stickers.length)];
  img.className = "sticker";
  img.style.left = Math.random() * window.innerWidth + "px";
  img.style.top = "-50px";
  document.body.appendChild(img);

  let y = -50;
  const interval = setInterval(()=>{
    y += 2 + Math.random()*3; // speed
    img.style.top = y + "px";
    if(y > window.innerHeight) {
      img.remove();
      clearInterval(interval);
    }
  }, 16);
}

// spawn sticker mỗi 0.5–1s
setInterval(spawnSticker, 500 + Math.random()*500);
