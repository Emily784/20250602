let video; let handPose; let hands = [];
let size = 35;
let magnets = []; let num = 5;
let draggingMagnet = null;

function preload() {
  // 不載入任何字型
  handPose = ml5.handPose({flipped: true});
}

let cardLabels = [
  "教育科技概論",
  "教育心理學",
  "教學原理與策略",
  "平面設計",
  "數位音訊與影像處理",
  "2D動畫製作",
  "程式設計與實習",
  "互動教材設計"
];
num = cardLabels.length; // 卡牌數量等於標籤數

// 定義分類區域
const categories = [
  { name: "教育理論", x: 120, y: 80, w: 180, h: 80, cards: ["教育科技概論", "教育心理學", "教學原理與策略"] },
  { name: "數位設計與媒體製作", x: 320, y: 80, w: 200, h: 80, cards: ["平面設計", "數位音訊與影像處理", "2D動畫製作"] },
  { name: "程式與數位技術應用", x: 520, y: 80, w: 200, h: 80, cards: ["程式設計與實習", "互動教材設計"] }
];

let coins = []; // 金幣動畫陣列
let rewardMode = false;
let rewardBox = {x: 320, y: 50, w: 180, h: 80}; // y: 50
let rewardCoins = [];
let catchedCoins = 0;

// 箱子與按鈕設定
let box = { x: 320, y: 440, w: 120, h: 40 };
const btnW = 60, btnH = 60;
let leftBtn, rightBtn;

let gameStarted = false; // 新增：遊戲是否開始

function setup() {
  createCanvas(640, 480);
  video = createCapture(VIDEO, {flipped: true});
  video.hide();
  handPose.detectStart(video, gotHands);

  rectMode(CENTER);
  textAlign(CENTER, CENTER);
  textSize(18);

  // 分成兩排，每排4張
  let cols = 4;
  let rows = 2;
  let cardW = 120;
  let cardH = 40;
  let xSpacing = width / (cols + 1);
  let yStart = height - 120; // 第一排的 y 座標
  let ySpacing = 60;         // 排與排之間的距離

  for (let i = 0; i < num; i++) {
    let row = Math.floor(i / cols);
    let col = i % cols;
    let x = xSpacing * (col + 1);
    let y = yStart + row * ySpacing;
    // 針對「數位音訊與影像處理」卡牌給較長寬度並往左移
    let w = (cardLabels[i] === "數位音訊與影像處理") ? 180 : cardW;
    if (cardLabels[i] === "數位音訊與影像處理") {
      x -= 30; // 往左移動 30 像素
    }
    magnets[i] = new Magnet(x, y, w, cardH, cardLabels[i]);
  }

  // 在這裡再給值
  leftBtn = { x: btnW/2, y: height - btnH/2, w: btnW, h: btnH };
  rightBtn = { x: width - btnW/2, y: height - btnH/2, w: btnW, h: btnH };
}

function draw() {
  background(220);
  image(video, 0, 0, width, height);

  // 遊戲封面
  if (!gameStarted) {
    // 半透明白色背景
    fill(255, 255, 255, 230);
    rect(width/2, height/2, 500, 350, 40);

    // 遊戲名稱
    fill(80, 40, 120);
    textSize(36);
    text("教育科技學系課程配對", width/2, height/2 - 60);

    // 補充說明
    textSize(20);
    fill(60, 60, 60);
    text("請將課程卡牌拖曳到正確的分類區域", width/2, height/2 - 10);

    // 開始按鈕
    let btnX = width/2, btnY = height/2 + 60, btnW = 180, btnH = 60;
    fill(120, 80, 200);
    rect(btnX, btnY, btnW, btnH, 20);
    fill(255);
    textSize(28);
    text("開始遊戲", btnX, btnY);

    // 檢查滑鼠是否點擊按鈕
    if (mouseIsPressed &&
        mouseX > btnX - btnW/2 && mouseX < btnX + btnW/2 &&
        mouseY > btnY - btnH/2 && mouseY < btnY + btnH/2) {
      gameStarted = true;
    }
    return; // 不執行後續遊戲內容
  }

  // 如果還沒進入獎勵模式
  if (!rewardMode) {
    // 預設所有分類區域顏色為黃色
    let catColors = categories.map(() => color(240, 240, 180));

    // 檢查卡牌是否放進錯誤分類，若有則該分類區域變紅
    for (let i = 0; i < num; i++) {
      let m = magnets[i];
      if (!m.sorted) {
        for (let c = 0; c < categories.length; c++) {
          let cat = categories[c];
          if (
            m.x > cat.x - cat.w / 2 && m.x < cat.x + cat.w / 2 &&
            m.y > cat.y - cat.h / 2 && m.y < cat.y + cat.h / 2
          ) {
            if (!cat.cards.includes(m.label)) {
              catColors[c] = color(255, 80, 80); // 紅色
            }
          }
        }
      }
    }

    // 畫出分類區域
    for (let c = 0; c < categories.length; c++) {
      let cat = categories[c];
      fill(catColors[c]);
      stroke(180, 140, 0);
      rect(cat.x, cat.y, cat.w, cat.h, 15);
      fill(120, 80, 0);
      noStroke();
      textSize(18);
      text(cat.name, cat.x, cat.y - cat.h / 2 + 18);
    }

    let index, thumb;
    if (hands.length > 0) {
      index = hands[0].keypoints[8];
      thumb = hands[0].keypoints[4];

      noFill();
      stroke(0, 255, 0);
      text("index", index.x, index.y);
      text("thumb", thumb.x, thumb.y);

      // 判斷是否抓取或拖曳
      let d = dist(index.x, index.y, thumb.x, thumb.y);
      if (d < 40) { // 食指與拇指靠近才算夾取，較容易夾取
        if (!draggingMagnet) {
          // 檢查是否有卡牌被抓住
          for (let i = 0; i < num; i++) {
            // 判斷點在卡牌範圍內，並放寬判斷範圍
            if (magnets[i].contains(
                  (index.x + thumb.x) / 2 + random(-10, 10),
                  (index.y + thumb.y) / 2 + random(-10, 10)
                )) {
              draggingMagnet = magnets[i];
              break;
            }
          }
        }
      } else {
        draggingMagnet = null; // 放開
      }

      // 拖曳卡牌
      if (draggingMagnet) {
        let targetX = (index.x + thumb.x) / 2;
        let targetY = (index.y + thumb.y) / 2;
        // 0.8 表示每次移動 80% 距離，越大越快，1 就是瞬間
        draggingMagnet.x += (targetX - draggingMagnet.x) * 0.8;
        draggingMagnet.y += (targetY - draggingMagnet.y) * 0.8;
      }
    } else {
      draggingMagnet = null;
    }

    // 檢查卡牌是否放進正確分類
    for (let i = 0; i < num; i++) {
      let m = magnets[i];
      if (!m.sorted) { // 只檢查還沒分類的卡牌
        for (let cat of categories) {
          if (m.x > cat.x - cat.w/2 && m.x < cat.x + cat.w/2 &&
              m.y > cat.y - cat.h/2 && m.y < cat.y + cat.h/2) {
            if (cat.cards.includes(m.label)) {
              m.sorted = true; // 標記已分類
              coins.push({x: m.x, y: m.y, vy: 2}); // 產生金幣
            }
          }
        }
      }
      m.display();
    }

    // 金幣動畫
    for (let c of coins) {
      fill(255, 215, 0);
      noStroke();
      ellipse(c.x, c.y, 30, 30);
      fill(255, 230, 80);
      ellipse(c.x, c.y, 18, 18);
      c.y += c.vy;
      c.vy += 0.2; // 加速度
    }

    // 檢查是否全部卡牌都 sorted
    let allSorted = magnets.every(m => m.sorted);
    if (allSorted) {
      rewardMode = true;
    }
  } else {
    // 恭喜畫面
    fill(255, 255, 200, 230);
    rect(width/2, height/2, 400, 120, 30);
    fill(120, 80, 0);
    textSize(32);
    text("恭喜你答對了！", width/2, height/2 - 20);
    textSize(20);
    text("請用手指碰上方的框，進入獎勵環節", width/2, height/2 + 20);

    // 畫出最上方的框
    noFill();
    stroke(255, 180, 0);
    strokeWeight(4);
    rect(rewardBox.x, rewardBox.y, rewardBox.w, rewardBox.h, 20);

    // 判斷手指是否碰到框
    if (hands.length > 0) {
      let idx = hands[0].keypoints[8];
      if (idx.x > rewardBox.x - rewardBox.w/2 && idx.x < rewardBox.x + rewardBox.w/2 &&
          idx.y > rewardBox.y - rewardBox.h/2 && idx.y < rewardBox.y + rewardBox.h/2) {
        // 產生較少的金幣，避免太密集
        for (let i = 0; i < 10; i++) { // 原本是20，改成
          let coinX;
          // 產生不在按鈕區域的 x
          do {
            coinX = random(0, width);
          } while (
            (coinX > leftBtn.x - btnW/2 && coinX < leftBtn.x + btnW/2) ||
            (coinX > rightBtn.x - btnW/2 && coinX < rightBtn.x + btnW/2)
          );
          rewardCoins.push({
            x: coinX,
            y: rewardBox.y,
            vy: random(0.3, 0.7),
            caught: false
          });
        }
      }
    }

    // 畫左右方向鍵
    fill(200);
    rect(leftBtn.x, leftBtn.y, leftBtn.w, leftBtn.h, 15);
    rect(rightBtn.x, rightBtn.y, rightBtn.w, rightBtn.h, 15);
    fill(80);
    textSize(32);
    text("<", leftBtn.x, leftBtn.y + 2);
    text(">", rightBtn.x, rightBtn.y + 2);

    // 箱子移動（滑鼠或手指都可）
    if (mouseIsPressed) {
      if (mouseX > leftBtn.x - btnW/2 && mouseX < leftBtn.x + btnW/2 &&
          mouseY > leftBtn.y - btnH/2 && mouseY < leftBtn.y + btnH/2) {
        box.x -= 20; // 速度加快
      }
      if (mouseX > rightBtn.x - btnW/2 && mouseX < rightBtn.x + btnW/2 &&
          mouseY > rightBtn.y - btnH/2 && mouseY < rightBtn.y + btnH/2) {
        box.x += 20; // 速度加快
      }
      box.x = constrain(box.x, box.w/2, width - box.w/2);
    }

    // 新增：手指觸碰左右方向鍵時也能移動箱子
    if (hands.length > 0) {
      let idx = hands[0].keypoints[8]; // 取第一隻手的食指
      // 放大判斷區域，讓觸碰更容易
      let btnW2 = btnW / 2 * 1.2;
      let btnH2 = btnH / 2 * 1.2;
      if (idx.x > leftBtn.x - btnW2 && idx.x < leftBtn.x + btnW2 &&
          idx.y > leftBtn.y - btnH2 && idx.y < leftBtn.y + btnH2) {
        box.x -= 20; // 速度加快
      }
      if (idx.x > rightBtn.x - btnW2 && idx.x < rightBtn.x + btnW2 &&
          idx.y > rightBtn.y - btnH2 && idx.y < rightBtn.y + btnH2) {
        box.x += 20; // 速度加快
      }
      box.x = constrain(box.x, box.w/2, width - box.w/2);
    }

    // 畫箱子
    fill(180, 120, 60);
    stroke(120, 80, 0);
    strokeWeight(3);
    rect(box.x, box.y, box.w, box.h, 10);
    noStroke();
    fill(255);
    textSize(18);
    text("箱子", box.x, box.y);

    // 產生金幣時避開按鈕區域
    if (hands.length > 0) {
      let idx = hands[0].keypoints[8];
      if (idx.x > rewardBox.x - rewardBox.w/2 && idx.x < rewardBox.x + rewardBox.w/2 &&
          idx.y > rewardBox.y - rewardBox.h/2 && idx.y < rewardBox.y + rewardBox.h/2) {
        for (let i = 0; i < 20; i++) {
          let coinX;
          // 產生不在按鈕區域的 x
          do {
            coinX = random(0, width);
          } while (
            (coinX > leftBtn.x - btnW/2 && coinX < leftBtn.x + btnW/2) ||
            (coinX > rightBtn.x - btnW/2 && coinX < rightBtn.x + btnW/2)
          );
          rewardCoins.push({
            x: coinX,
            y: rewardBox.y,
            vy: random(0.3, 0.7),
            caught: false
          });
        }
      }
    }

    // 金幣動畫
    for (let coin of rewardCoins) {
      fill(255, 215, 0);
      noStroke();
      ellipse(coin.x, coin.y, 30, 30);
      fill(255, 230, 80);
      ellipse(coin.x, coin.y, 18, 18);
      coin.y += coin.vy;
      coin.vy += 0.01;
      // 判斷金幣是否掉進箱子
      if (
        coin.x > box.x - box.w/2 && coin.x < box.x + box.w/2 &&
        coin.y > box.y - box.h/2 && coin.y < box.y + box.h/2
      ) {
        coin.caught = true;
        catchedCoins++;
      }
    }

    // 右上角顯示接到的金幣數量
    fill(255, 215, 0);
    noStroke();
    ellipse(width - 50, 40, 30, 30);
    fill(120, 80, 0);
    textSize(20);
    textAlign(LEFT, CENTER);
    text("x " + catchedCoins, width - 35, 40);
    textAlign(CENTER, CENTER);
  }
}

function gotHands(results) {
  hands = results;
}

// 卡牌類別
class Magnet {
  constructor(x, y, w, h, label) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.label = label || "";
    this.sorted = false;
  }

  display() {
    fill(128, 64, 200); // 紫色
    noStroke();         // 不要邊框
    rect(this.x, this.y, this.w, this.h, 10);
    fill(255);
    noStroke();
    // 讓字體高度不超過卡牌高度的60%
    let fontSize = Math.min(this.h * 0.6, 16);
    textSize(fontSize);
    text(this.label, this.x, this.y);
  }

  contains(px, py) {
    return px > this.x - this.w / 2 && px < this.x + this.w / 2 &&
           py > this.y - this.h / 2 && py < this.y + this.h / 2;
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
  }
}

// 計算點到線段的最短距離
function distToSegment(p, v, w) {
  let l2 = p5.Vector.dist(v, w) ** 2;
  if (l2 === 0) return p5.Vector.dist(p, v);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = max(0, min(1, t));
  return p5.Vector.dist(p, createVector(
    v.x + t * (w.x - v.x),
    v.y + t * (w.y - v.y)
  ));
}