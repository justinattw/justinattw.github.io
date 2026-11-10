export function drawLogo(ctx, index, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 100, size / 100);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  if (index === 0) {
    // A bookish cat, not an official Octocat asset.
    ctx.beginPath();
    ctx.moveTo(-29, -13); ctx.lineTo(-34, -42); ctx.lineTo(-11, -27);
    ctx.quadraticCurveTo(0, -32, 13, -27);
    ctx.lineTo(34, -42); ctx.lineTo(29, -13);
    ctx.bezierCurveTo(47, 28, -44, 35, -29, -13); ctx.fill();
    ctx.beginPath(); ctx.moveTo(15, 23); ctx.bezierCurveTo(45, 54, 60, 12, 41, 12); ctx.stroke();
    ctx.fillStyle = '#f0e5c9';
    for (const eye of [-12, 12]) { ctx.beginPath(); ctx.ellipse(eye, -3, 3, 5, 0, 0, Math.PI * 2); ctx.fill(); }
  } else if (index === 1) {
    ctx.beginPath(); ctx.arc(0, 0, 36, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-31, 18); ctx.lineTo(-8, -8); ctx.lineTo(7, 5); ctx.lineTo(32, -25); ctx.stroke();
    for (const [px, py] of [[-31,18],[-8,-8],[7,5],[32,-25]]) { ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill(); }
  } else if (index === 2) {
    for (const dy of [-18, 0, 18]) {
      ctx.beginPath(); ctx.moveTo(-38, dy); ctx.bezierCurveTo(-10, dy - 30, 10, dy + 30, 38, dy); ctx.stroke();
    }
  } else if (index === 3) {
    ctx.beginPath(); ctx.moveTo(-43, -19); ctx.lineTo(0, -44); ctx.lineTo(43, -19); ctx.closePath(); ctx.fill();
    for (const px of [-27, -9, 9, 27]) ctx.fillRect(px - 4, -11, 8, 41);
    ctx.fillRect(-43, 34, 86, 7);
  } else {
    ctx.beginPath(); ctx.moveTo(-30, 33); ctx.lineTo(-30, -30); ctx.lineTo(29, 33); ctx.lineTo(29, -30); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(38, -37, 10, 21, .7, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
