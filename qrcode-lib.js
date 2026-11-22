/**
 * Générateur QR Code autonome léger (ISO/IEC 18004, versions 1 à 10, niveau M, mode Byte UTF-8).
 * Sans dépendance externe pour fonctionner hors-ligne et sur GitHub Pages.
 */
(function (global) {
  "use strict";

  const EC_CODEWORDS_PER_BLOCK_M = [null, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
  const NUM_ERROR_CORRECTION_BLOCKS_M = [null, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];

  function getBit(x, i) {
    return ((x >>> i) & 1) !== 0;
  }

  function reedSolomonMultiply(x, y) {
    let z = 0;
    for (let i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11d);
      z ^= ((y >>> i) & 1) * x;
    }
    return z;
  }

  function reedSolomonComputeDivisor(degree) {
    const result = new Uint8Array(degree);
    result[degree - 1] = 1;
    let root = 1;
    for (let i = 0; i < degree; i++) {
      for (let j = 0; j < degree; j++) {
        result[j] = reedSolomonMultiply(result[j], root);
        if (j + 1 < degree) {
          result[j] ^= result[j + 1];
        }
      }
      root = reedSolomonMultiply(root, 0x02);
    }
    return result;
  }

  function reedSolomonComputeRemainder(data, divisor) {
    const result = new Uint8Array(divisor.length);
    for (const b of data) {
      const factor = b ^ result[0];
      result.copyWithin(0, 1);
      result[divisor.length - 1] = 0;
      divisor.forEach((coef, i) => {
        result[i] ^= reedSolomonMultiply(coef, factor);
      });
    }
    return result;
  }

  function getAlignmentPatternPositions(version, size) {
    if (version === 1) return [];
    const numAlign = Math.floor(version / 7) + 2;
    const step = version === 32
      ? 26
      : Math.ceil((size - 13) / (numAlign * 2 - 2)) * 2;
    const result = [6];
    for (let pos = size - 7; result.length < numAlign; pos -= step) {
      result.splice(1, 0, pos);
    }
    return result;
  }

  function getNumDataCodewords(version) {
    const size = version * 4 + 17;
    let rawModules = size * size;
    rawModules -= 3 * 64; // 3 finder + separators (8x8)
    rawModules -= 2 * (size - 16); // timing patterns
    rawModules -= 31; // format info + dark module
    if (version >= 2) {
      const numAlign = Math.floor(version / 7) + 2;
      rawModules -= (numAlign * numAlign - 3) * 25;
      rawModules += (numAlign - 2) * 10; // overlap with timing patterns
    }
    if (version >= 7) {
      rawModules -= 36; // version info
    }
    const totalCodewords = Math.floor(rawModules / 8);
    return totalCodewords - EC_CODEWORDS_PER_BLOCK_M[version] * NUM_ERROR_CORRECTION_BLOCKS_M[version];
  }

  function appendBits(val, len, bitBuffer) {
    for (let i = len - 1; i >= 0; i--) {
      bitBuffer.push((val >>> i) & 1);
    }
  }

  function createQrMatrix(text) {
    const bytes = new TextEncoder().encode(text);

    let version = 1;
    let dataCapacityBytes = 0;
    for (; version <= 10; version++) {
      const charCountBits = version <= 9 ? 8 : 16;
      const capacityBits = getNumDataCodewords(version) * 8;
      dataCapacityBytes = Math.floor((capacityBits - 4 - charCountBits) / 8);
      if (bytes.length <= dataCapacityBytes) break;
    }
    if (version > 10) {
      throw new Error("Texte trop long pour le QR Code (max ~213 octets).");
    }

    const bitBuffer = [];
    appendBits(0b0100, 4, bitBuffer); // Byte mode
    appendBits(bytes.length, version <= 9 ? 8 : 16, bitBuffer);
    for (const b of bytes) appendBits(b, 8, bitBuffer);

    const dataCapacityBits = getNumDataCodewords(version) * 8;
    appendBits(0, Math.min(4, dataCapacityBits - bitBuffer.length), bitBuffer);
    appendBits(0, (8 - (bitBuffer.length % 8)) % 8, bitBuffer);

    for (let padByte = 0xec; bitBuffer.length < dataCapacityBits; padByte ^= 0xec ^ 0x11) {
      appendBits(padByte, 8, bitBuffer);
    }

    const dataCodewords = new Uint8Array(bitBuffer.length / 8);
    bitBuffer.forEach((bit, i) => {
      dataCodewords[i >>> 3] |= bit << (7 - (i & 7));
    });

    // Error correction & interleaving
    const numBlocks = NUM_ERROR_CORRECTION_BLOCKS_M[version];
    const blockEcLen = EC_CODEWORDS_PER_BLOCK_M[version];
    const totalDataCw = dataCodewords.length;
    const rawCodewords = totalDataCw + blockEcLen * numBlocks;
    const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
    const shortBlockLen = Math.floor(rawCodewords / numBlocks);

    const blocks = [];
    const rsDiv = reedSolomonComputeDivisor(blockEcLen);
    for (let i = 0, k = 0; i < numBlocks; i++) {
      const datLen = shortBlockLen - blockEcLen + (i < numShortBlocks ? 0 : 1);
      const dat = dataCodewords.subarray(k, k + datLen);
      k += datLen;
      const ecc = reedSolomonComputeRemainder(dat, rsDiv);
      const block = new Uint8Array(datLen + blockEcLen);
      block.set(dat, 0);
      block.set(ecc, datLen);
      blocks.push({ dat, ecc });
    }

    const allCodewords = new Uint8Array(rawCodewords);
    let idx = 0;
    const maxDatLen = shortBlockLen - blockEcLen + 1;
    for (let i = 0; i < maxDatLen; i++) {
      for (let j = 0; j < numBlocks; j++) {
        if (i < blocks[j].dat.length) {
          allCodewords[idx++] = blocks[j].dat[i];
        }
      }
    }
    for (let i = 0; i < blockEcLen; i++) {
      for (let j = 0; j < numBlocks; j++) {
        allCodewords[idx++] = blocks[j].ecc[i];
      }
    }

    // Build matrix
    const size = version * 4 + 17;
    const modules = Array.from({ length: size }, () => new Array(size).fill(false));
    const isFunction = Array.from({ length: size }, () => new Array(size).fill(false));

    function setFunctionModule(r, c, isDark) {
      modules[r][c] = isDark;
      isFunction[r][c] = true;
    }

    function drawFinderPattern(centerR, centerC) {
      for (let dr = -4; dr <= 4; dr++) {
        for (let dc = -4; dc <= 4; dc++) {
          const r = centerR + dr;
          const c = centerC + dc;
          if (r >= 0 && r < size && c >= 0 && c < size) {
            const dist = Math.max(Math.abs(dr), Math.abs(dc));
            setFunctionModule(r, c, dist !== 2 && dist !== 4);
          }
        }
      }
    }

    function drawAlignmentPattern(centerR, centerC) {
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          setFunctionModule(centerR + dr, centerC + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
        }
      }
    }

    function drawFormatBits(mask) {
      // Level M format bits = 00 (0)
      const data = (0 << 3) | mask;
      let rem = data;
      for (let i = 0; i < 10; i++) {
        rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      }
      const bits = ((data << 10) | rem) ^ 0x5412;

      for (let i = 0; i <= 5; i++) setFunctionModule(i, 8, getBit(bits, i));
      setFunctionModule(7, 8, getBit(bits, 6));
      setFunctionModule(8, 8, getBit(bits, 7));
      setFunctionModule(8, 7, getBit(bits, 8));
      for (let i = 9; i < 15; i++) setFunctionModule(8, 14 - i, getBit(bits, i));

      for (let i = 0; i < 8; i++) setFunctionModule(8, size - 1 - i, getBit(bits, i));
      for (let i = 8; i < 15; i++) setFunctionModule(size - 15 + i, 8, getBit(bits, i));
      setFunctionModule(size - 8, 8, true);
    }

    // Timing patterns
    for (let i = 0; i < size; i++) {
      setFunctionModule(6, i, i % 2 === 0);
      setFunctionModule(i, 6, i % 2 === 0);
    }

    // Finder patterns
    drawFinderPattern(3, 3);
    drawFinderPattern(3, size - 4);
    drawFinderPattern(size - 4, 3);

    // Alignment patterns
    const alignPos = getAlignmentPatternPositions(version, size);
    for (let i = 0; i < alignPos.length; i++) {
      for (let j = 0; j < alignPos.length; j++) {
        if (
          !(i === 0 && j === 0) &&
          !(i === 0 && j === alignPos.length - 1) &&
          !(i === alignPos.length - 1 && j === 0)
        ) {
          drawAlignmentPattern(alignPos[i], alignPos[j]);
        }
      }
    }

    // Reserve format bits
    drawFormatBits(0);

    // Version bits (V7+)
    if (version >= 7) {
      let rem = version;
      for (let i = 0; i < 12; i++) {
        rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
      }
      const bits = (version << 12) | rem;
      for (let i = 0; i < 18; i++) {
        const bit = getBit(bits, i);
        const a = size - 11 + (i % 3);
        const b = Math.floor(i / 3);
        setFunctionModule(b, a, bit);
        setFunctionModule(a, b, bit);
      }
    }

    // Draw codewords in zigzag
    let bitIdx = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < size; vert++) {
        for (let j = 0; j < 2; j++) {
          const c = right - j;
          const upward = ((right + 1) & 2) === 0;
          const r = upward ? size - 1 - vert : vert;
          if (!isFunction[r][c] && bitIdx < allCodewords.length * 8) {
            modules[r][c] = getBit(allCodewords[bitIdx >>> 3], 7 - (bitIdx & 7));
            bitIdx++;
          }
        }
      }
    }

    function applyMask(mask) {
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (isFunction[r][c]) continue;
          let invert = false;
          switch (mask) {
            case 0: invert = (r + c) % 2 === 0; break;
            case 1: invert = r % 2 === 0; break;
            case 2: invert = c % 3 === 0; break;
            case 3: invert = (r + c) % 3 === 0; break;
            case 4: invert = (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0; break;
            case 5: invert = ((r * c) % 2) + ((r * c) % 3) === 0; break;
            case 6: invert = (((r * c) % 2) + ((r * c) % 3)) % 2 === 0; break;
            case 7: invert = (((r + c) % 2) + ((r * c) % 3)) % 2 === 0; break;
          }
          if (invert) modules[r][c] = !modules[r][c];
        }
      }
    }

    function computePenalty() {
      let penalty = 0;
      // Consecutive runs in rows & cols
      for (let r = 0; r < size; r++) {
        let runColor = modules[r][0];
        let runLen = 1;
        for (let c = 1; c < size; c++) {
          if (modules[r][c] === runColor) {
            runLen++;
            if (runLen === 5) penalty += 3;
            else if (runLen > 5) penalty += 1;
          } else {
            runColor = modules[r][c];
            runLen = 1;
          }
        }
      }
      for (let c = 0; c < size; c++) {
        let runColor = modules[0][c];
        let runLen = 1;
        for (let r = 1; r < size; r++) {
          if (modules[r][c] === runColor) {
            runLen++;
            if (runLen === 5) penalty += 3;
            else if (runLen > 5) penalty += 1;
          } else {
            runColor = modules[r][c];
            runLen = 1;
          }
        }
      }
      // 2x2 blocks
      for (let r = 0; r < size - 1; r++) {
        for (let c = 0; c < size - 1; c++) {
          const color = modules[r][c];
          if (
            color === modules[r][c + 1] &&
            color === modules[r + 1][c] &&
            color === modules[r + 1][c + 1]
          ) {
            penalty += 3;
          }
        }
      }
      // Dark balance
      let dark = 0;
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (modules[r][c]) dark++;
        }
      }
      const total = size * size;
      const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
      if (k > 0) penalty += k * 10;
      return penalty;
    }

    let bestMask = 0;
    let minPenalty = Infinity;
    for (let m = 0; m < 8; m++) {
      applyMask(m);
      drawFormatBits(m);
      const p = computePenalty();
      if (p < minPenalty) {
        minPenalty = p;
        bestMask = m;
      }
      applyMask(m); // revert
    }
    applyMask(bestMask);
    drawFormatBits(bestMask);

    return { size, modules };
  }

  function toSvgString(text, quietZone = 4) {
    const { size, modules } = createQrMatrix(text);
    const total = size + quietZone * 2;
    let parts = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (modules[r][c]) {
          parts.push(`M${c + quietZone},${r + quietZone}h1v1h-1z`);
        }
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" role="img" aria-label="QR Code">` +
      `<rect width="100%" height="100%" fill="#ffffff"/>` +
      `<path d="${parts.join("")}" fill="#1a2238"/>` +
      `</svg>`;
  }

  function drawToCanvas(canvas, text, pixelSize = 800, quietZone = 4) {
    const { size, modules } = createQrMatrix(text);
    const total = size + quietZone * 2;
    const scale = Math.max(4, Math.floor(pixelSize / total));
    const actualSize = total * scale;
    canvas.width = actualSize;
    canvas.height = actualSize;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, actualSize, actualSize);
    ctx.fillStyle = "#1a2238";
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (modules[r][c]) {
          ctx.fillRect((c + quietZone) * scale, (r + quietZone) * scale, scale, scale);
        }
      }
    }
    return canvas;
  }

  const api = { createQrMatrix, toSvgString, drawToCanvas };
  global.SimpleQR = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
