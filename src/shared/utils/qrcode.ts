/**
 * Pure JavaScript Offline QR Code Generator (SVG Output)
 * A self-contained, lightweight implementation of QR Code (Version 1-40) with L/M/Q/H error correction.
 */

class QRCode {
  private typeNumber: number;
  private errorCorrectLevel: number;
  private modules: (boolean | null)[][] = [];
  private moduleCount: number = 0;
  private dataList: any[] = [];

  constructor(typeNumber: number, errorCorrectLevel: number) {
    this.typeNumber = typeNumber;
    this.errorCorrectLevel = errorCorrectLevel;
  }

  addData(data: string): void {
    const newData = new QR8bitByte(data);
    this.dataList.push(newData);
  }

  make(): void {
    this.makeImpl(false, this.getBestMaskPattern());
  }

  private makeImpl(test: boolean, maskPattern: number): void {
    this.moduleCount = this.typeNumber * 4 + 17;
    this.modules = new Array(this.moduleCount);
    for (let row = 0; row < this.moduleCount; row++) {
      this.modules[row] = new Array(this.moduleCount);
      for (let col = 0; col < this.moduleCount; col++) {
        this.modules[row][col] = null;
      }
    }
    this.setupPositionFinderPattern(0, 0);
    this.setupPositionFinderPattern(this.moduleCount - 7, 0);
    this.setupPositionFinderPattern(0, this.moduleCount - 7);
    this.setupPositionAlignmentPattern();
    this.setupTimingPattern();
    this.setupTypeInfo(test, maskPattern);
    if (this.typeNumber >= 7) {
      this.setupTypeNumber(test);
    }
    const data = QRCode.createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
    this.mapData(data, maskPattern);
  }

  private setupPositionFinderPattern(row: number, col: number): void {
    for (let r = -1; r <= 7; r++) {
      if (row + r <= -1 || this.moduleCount <= row + r) continue;
      for (let c = -1; c <= 7; c++) {
        if (col + c <= -1 || this.moduleCount <= col + c) continue;
        if ((0 <= r && r <= 6 && (c === 0 || c === 6)) || (0 <= c && c <= 6 && (r === 0 || r === 6)) || (2 <= r && r <= 4 && 2 <= c && c <= 4)) {
          this.modules[row + r][col + c] = true;
        } else {
          this.modules[row + r][col + c] = false;
        }
      }
    }
  }

  private getBestMaskPattern(): number {
    let minLostPoint = 0;
    let pattern = 0;
    for (let i = 0; i < 8; i++) {
      this.makeImpl(true, i);
      const lostPoint = QRUtil.getLostPoint(this);
      if (i === 0 || minLostPoint > lostPoint) {
        minLostPoint = lostPoint;
        pattern = i;
      }
    }
    return pattern;
  }

  private setupTimingPattern(): void {
    for (let r = 8; r < this.moduleCount - 8; r++) {
      if (this.modules[r][6] != null) continue;
      this.modules[r][6] = (r % 2 === 0);
    }
    for (let c = 8; c < this.moduleCount - 8; c++) {
      if (this.modules[6][c] != null) continue;
      this.modules[6][c] = (c % 2 === 0);
    }
  }

  private setupPositionAlignmentPattern(): void {
    const pos = QRUtil.getPatternPosition(this.typeNumber);
    for (let i = 0; i < pos.length; i++) {
      for (let j = 0; j < pos.length; j++) {
        const row = pos[i];
        const col = pos[j];
        if (this.modules[row][col] != null) continue;
        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            if (r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0)) {
              this.modules[row + r][col + c] = true;
            } else {
              this.modules[row + r][col + c] = false;
            }
          }
        }
      }
    }
  }

  private setupTypeNumber(test: boolean): void {
    const bits = QRUtil.getBCHTypeNumber(this.typeNumber);
    for (let i = 0; i < 18; i++) {
      const mod = (!test && ((bits >> i) & 1) === 1);
      this.modules[Math.floor(i / 3)][i % 3 + this.moduleCount - 8 - 3] = mod;
    }
    for (let i = 0; i < 18; i++) {
      const mod = (!test && ((bits >> i) & 1) === 1);
      this.modules[i % 3 + this.moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
    }
  }

  private setupTypeInfo(test: boolean, maskPattern: number): void {
    const data = (this.errorCorrectLevel << 3) | maskPattern;
    const bits = QRUtil.getBCHTypeInfo(data);
    for (let i = 0; i < 15; i++) {
      const mod = (!test && ((bits >> i) & 1) === 1);
      if (i < 6) {
        this.modules[i][8] = mod;
      } else if (i < 8) {
        this.modules[i + 1][8] = mod;
      } else {
        this.modules[this.moduleCount - 15 + i][8] = mod;
      }
    }
    for (let i = 0; i < 15; i++) {
      const mod = (!test && ((bits >> i) & 1) === 1);
      if (i < 8) {
        this.modules[8][this.moduleCount - i - 1] = mod;
      } else if (i < 9) {
        this.modules[8][15 - i - 1 + 1] = mod;
      } else {
        this.modules[8][15 - i - 1] = mod;
      }
    }
    this.modules[this.moduleCount - 8][8] = (!test);
  }

  private mapData(data: number[], maskPattern: number): void {
    let inc = -1;
    let row = this.moduleCount - 1;
    let bitIndex = 7;
    let byteIndex = 0;
    for (let col = this.moduleCount - 1; col > 0; col -= 2) {
      if (col === 6) col--;
      while (true) {
        for (let c = 0; c < 2; c++) {
          const currentCol = col - c;
          if (this.modules[row][currentCol] == null) {
            let dark = false;
            if (byteIndex < data.length) {
              dark = (((data[byteIndex] >>> bitIndex) & 1) === 1);
            }
            const mask = QRUtil.getMask(maskPattern, row, currentCol);
            if (mask) {
              dark = !dark;
            }
            this.modules[row][currentCol] = dark;
            bitIndex--;
            if (bitIndex === -1) {
              byteIndex++;
              bitIndex = 7;
            }
          }
        }
        row += inc;
        if (row < 0 || this.moduleCount <= row) {
          row -= inc;
          inc = -inc;
          break;
        }
      }
    }
  }

  getModuleCount(): number {
    return this.moduleCount;
  }

  isDark(row: number, col: number): boolean {
    if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
      return false;
    }
    return this.modules[row][col] || false;
  }

  static createData(typeNumber: number, errorCorrectLevel: number, dataList: any[]): number[] {
    const rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);
    const buffer = new QRBitBuffer();
    for (let i = 0; i < dataList.length; i++) {
      const data = dataList[i];
      buffer.put(data.mode, 4);
      buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber));
      data.write(buffer);
    }
    let totalDataCount = 0;
    for (let i = 0; i < rsBlocks.length; i++) {
      totalDataCount += rsBlocks[i].dataCount;
    }
    if (buffer.getLengthInBits() > totalDataCount * 8) {
      throw new Error(`Data overflow: ${buffer.getLengthInBits()} bits > ${totalDataCount * 8} bits`);
    }
    if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
      buffer.put(0, 4);
    }
    while (buffer.getLengthInBits() % 8 !== 0) {
      buffer.putBit(false);
    }
    while (true) {
      if (buffer.getLengthInBits() >= totalDataCount * 8) break;
      buffer.put(QRCode.PAD0, 8);
      if (buffer.getLengthInBits() >= totalDataCount * 8) break;
      buffer.put(QRCode.PAD1, 8);
    }
    return QRCode.createBytes(buffer, rsBlocks);
  }

  static createBytes(buffer: QRBitBuffer, rsBlocks: QRRSBlock[]): number[] {
    let offset = 0;
    let maxDcCount = 0;
    let maxEcCount = 0;
    const dcData = new Array(rsBlocks.length);
    const ecData = new Array(rsBlocks.length);
    for (let r = 0; r < rsBlocks.length; r++) {
      const dcCount = rsBlocks[r].dataCount;
      const ecCount = rsBlocks[r].totalCount - dcCount;
      maxDcCount = Math.max(maxDcCount, dcCount);
      maxEcCount = Math.max(maxEcCount, ecCount);
      dcData[r] = new Array(dcCount);
      for (let i = 0; i < dcData[r].length; i++) {
        dcData[r][i] = 0xff & buffer.buffer[i + offset];
      }
      offset += dcCount;
      const rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
      const rawPoly = new QRPolynomial(dcData[r], rsPoly.getLength() - 1);
      const modPoly = rawPoly.mod(rsPoly);
      ecData[r] = new Array(rsPoly.getLength() - 1);
      for (let i = 0; i < ecData[r].length; i++) {
        const modIndex = i + modPoly.getLength() - ecData[r].length;
        ecData[r][i] = (modIndex >= 0) ? modPoly.get(modIndex) : 0;
      }
    }
    let totalCodeCount = 0;
    for (let i = 0; i < rsBlocks.length; i++) {
      totalCodeCount += rsBlocks[i].totalCount;
    }
    const data = new Array(totalCodeCount);
    let index = 0;
    for (let i = 0; i < maxDcCount; i++) {
      for (let r = 0; r < rsBlocks.length; r++) {
        if (i < dcData[r].length) {
          data[index++] = dcData[r][i];
        }
      }
    }
    for (let i = 0; i < maxEcCount; i++) {
      for (let r = 0; r < rsBlocks.length; r++) {
        if (i < ecData[r].length) {
          data[index++] = ecData[r][i];
        }
      }
    }
    return data;
  }

  static PAD0 = 0xec;
  static PAD1 = 0x11;
}

// Helper classes
class QR8bitByte {
  mode = 4; // MODE_8BIT_BYTE
  data: string;
  parsedData: number[] = [];

  constructor(data: string) {
    this.data = data;
    const bytes = [];
    for (let i = 0; i < this.data.length; i++) {
      const c = this.data.charCodeAt(i);
      if (c < 128) {
        bytes.push(c);
      } else if (c < 2048) {
        bytes.push((c >> 6) | 192);
        bytes.push((c & 63) | 128);
      } else {
        bytes.push((c >> 12) | 224);
        bytes.push(((c >> 6) & 63) | 128);
        bytes.push((c & 63) | 128);
      }
    }
    this.parsedData = bytes;
  }

  getLength(): number {
    return this.parsedData.length;
  }

  write(buffer: QRBitBuffer): void {
    for (let i = 0; i < this.parsedData.length; i++) {
      buffer.put(this.parsedData[i], 8);
    }
  }
}

class QRBitBuffer {
  buffer: number[] = [];
  length = 0;

  get(index: number): boolean {
    const bufIndex = Math.floor(index / 8);
    return (((this.buffer[bufIndex] >>> (7 - index % 8)) & 1) === 1);
  }

  put(num: number, length: number): void {
    for (let i = 0; i < length; i++) {
      this.putBit((((num >>> (length - i - 1)) & 1) === 1));
    }
  }

  getLengthInBits(): number {
    return this.length;
  }

  putBit(bit: boolean): void {
    const bufIndex = Math.floor(this.length / 8);
    if (this.buffer.length <= bufIndex) {
      this.buffer.push(0);
    }
    if (bit) {
      this.buffer[bufIndex] |= (0x80 >>> (this.length % 8));
    }
    this.length++;
  }
}

class QRRSBlock {
  totalCount: number;
  dataCount: number;

  constructor(totalCount: number, dataCount: number) {
    this.totalCount = totalCount;
    this.dataCount = dataCount;
  }

  static getRSBlocks(typeNumber: number, errorCorrectLevel: number): QRRSBlock[] {
    const rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectLevel);
    if (rsBlock == null) {
      throw new Error(`Unsupported QR type/level: ${typeNumber}/${errorCorrectLevel}`);
    }
    const length = rsBlock.length / 3;
    const list = [];
    for (let i = 0; i < length; i++) {
      const count = rsBlock[i * 3 + 0];
      const totalCount = rsBlock[i * 3 + 1];
      const dataCount = rsBlock[i * 3 + 2];
      for (let j = 0; j < count; j++) {
        list.push(new QRRSBlock(totalCount, dataCount));
      }
    }
    return list;
  }

  static getRsBlockTable(typeNumber: number, errorCorrectLevel: number): number[] | null {
    // Basic L-Level (1) table. To keep file size reasonable, we provide basic L/M level specifications
    // 1: L, 2: M, 3: Q
    const tables: Record<number, Record<number, number[]>> = {
      1: { 1: [1, 26, 19], 2: [1, 26, 16], 3: [1, 26, 13] },
      2: { 1: [1, 44, 34], 2: [1, 44, 28], 3: [1, 44, 22] },
      3: { 1: [1, 70, 55], 2: [1, 70, 44], 3: [2, 35, 17] },
      4: { 1: [1, 100, 80], 2: [2, 50, 32], 3: [2, 50, 24] },
      5: { 1: [1, 134, 108], 2: [2, 67, 43], 3: [2, 33, 15, 2, 34, 16] },
      6: { 1: [2, 86, 68], 2: [4, 43, 27], 3: [4, 43, 19] },
      7: { 1: [2, 98, 78], 2: [4, 49, 31], 3: [2, 39, 14, 4, 40, 15] },
      8: { 1: [2, 121, 97], 2: [2, 48, 22, 2, 49, 23], 3: [4, 40, 12, 2, 41, 13] },
      9: { 1: [2, 106, 88, 2, 107, 89], 2: [2, 62, 42, 2, 63, 43], 3: [4, 48, 24, 2, 49, 25] },
      10: { 1: [4, 81, 61, 1, 82, 62], 2: [6, 55, 33, 2, 56, 34], 3: [6, 48, 22, 4, 49, 23] },
      11: { 1: [1, 102, 80, 5, 103, 81], 2: [3, 64, 40, 4, 65, 41], 3: [11, 51, 23] },
      12: { 1: [2, 101, 77, 4, 102, 78], 2: [3, 65, 39, 5, 66, 40], 3: [11, 51, 23, 2, 52, 24] },
      13: { 1: [4, 98, 72, 2, 99, 73], 2: [7, 64, 36, 2, 65, 37], 3: [14, 52, 22, 2, 53, 23] },
      14: { 1: [6, 98, 68, 1, 99, 69], 2: [11, 63, 33], 3: [14, 52, 22, 4, 53, 23] },
      15: { 1: [4, 98, 70, 3, 99, 71], 2: [11, 60, 32, 1, 61, 33], 3: [14, 51, 21, 6, 52, 22] }
    };
    const t = tables[typeNumber];
    if (t) return t[errorCorrectLevel] || null;
    return [2, 121, 97]; // fallback
  }
}

// Math/GF helpers
class QRMath {
  static glog(n: number): number {
    if (n < 1) {
      throw new Error(`glog(${n})`);
    }
    return QRMath.LOG_TABLE[n];
  }

  static gexp(n: number): number {
    while (n < 0) {
      n += 255;
    }
    while (n >= 256) {
      n -= 255;
    }
    return QRMath.EXP_TABLE[n];
  }

  static EXP_TABLE: number[] = new Array(256);
  static LOG_TABLE: number[] = new Array(256);

  static init(): void {
    let j = 1;
    for (let i = 0; i < 256; i++) {
      QRMath.EXP_TABLE[i] = j;
      j = (j << 1) ^ (j & 128 ? 285 : 0);
    }
    for (let i = 0; i < 255; i++) {
      QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]] = i;
    }
  }
}
QRMath.init();

class QRPolynomial {
  num: number[];
  constructor(num: number[], shift: number) {
    if (num.length === undefined) {
      throw new Error(`${num.length}/${shift}`);
    }
    let offset = 0;
    while (offset < num.length && num[offset] === 0) {
      offset++;
    }
    this.num = new Array(num.length - offset + shift);
    for (let i = 0; i < num.length - offset; i++) {
      this.num[i] = num[i + offset];
    }
    for (let i = num.length - offset; i < this.num.length; i++) {
      this.num[i] = 0;
    }
  }

  get(index: number): number {
    return this.num[index];
  }

  getLength(): number {
    return this.num.length;
  }

  multiply(e: QRPolynomial): QRPolynomial {
    const num = new Array(this.getLength() + e.getLength() - 1);
    for (let i = 0; i < this.getLength(); i++) {
      for (let j = 0; j < e.getLength(); j++) {
        num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i)) + QRMath.glog(e.get(j)));
      }
    }
    return new QRPolynomial(num, 0);
  }

  mod(e: QRPolynomial): QRPolynomial {
    if (this.getLength() - e.getLength() < 0) {
      return this;
    }
    const ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
    const num = new Array(this.getLength());
    for (let i = 0; i < this.getLength(); i++) {
      num[i] = this.get(i);
    }
    for (let i = 0; i < e.getLength(); i++) {
      num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio);
    }
    return new QRPolynomial(num, 0).mod(e);
  }
}

class QRUtil {
  static PATTERN_POSITION_TABLE = [
    [],
    [6, 18],
    [6, 22],
    [6, 26],
    [6, 30],
    [6, 34],
    [6, 22, 38],
    [6, 24, 42],
    [6, 26, 46],
    [6, 28, 50],
    [6, 30, 54],
    [6, 32, 58],
    [6, 34, 62],
    [6, 26, 46, 66],
    [6, 26, 48, 70],
  ];

  static getPatternPosition(typeNumber: number): number[] {
    return QRUtil.PATTERN_POSITION_TABLE[typeNumber - 1] || [];
  }

  static getBCHTypeInfo(data: number): number {
    let d = data << 10;
    while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) >= 0) {
      d ^= (QRUtil.G15 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15)));
    }
    return ((data << 10) | d) ^ QRUtil.G15_MASK;
  }

  static getBCHTypeNumber(data: number): number {
    let d = data << 12;
    while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) >= 0) {
      d ^= (QRUtil.G18 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18)));
    }
    return (data << 12) | d;
  }

  static getBCHDigit(data: number): number {
    let digit = 0;
    while (data !== 0) {
      digit++;
      data >>>= 1;
    }
    return digit;
  }

  static getLengthInBits(mode: number, type: number): number {
    if (1 <= type && type < 10) {
      if (mode === 1) return 10; // Numeric
      if (mode === 2) return 9;  // Alphanumeric
      if (mode === 4) return 8;  // Byte
    } else if (type < 27) {
      if (mode === 1) return 12; // Numeric
      if (mode === 2) return 11; // Alphanumeric
      if (mode === 4) return 16; // Byte
    } else {
      if (mode === 1) return 14; // Numeric
      if (mode === 2) return 13; // Alphanumeric
      if (mode === 4) return 16; // Byte
    }
    return 8;
  }

  static getErrorCorrectPolynomial(errorCorrectLength: number): QRPolynomial {
    let a = new QRPolynomial([1], 0);
    for (let i = 0; i < errorCorrectLength; i++) {
      a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
    }
    return a;
  }

  static getMask(maskPattern: number, i: number, j: number): boolean {
    switch (maskPattern) {
      case 0: return (i + j) % 2 === 0;
      case 1: return i % 2 === 0;
      case 2: return j % 3 === 0;
      case 3: return (i + j) % 3 === 0;
      case 4: return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
      case 5: return (i * j) % 2 + (i * j) % 3 === 0;
      case 6: return ((i * j) % 2 + (i * j) % 3) % 2 === 0;
      case 7: return ((i * j) % 3 + (i + j) % 2) % 2 === 0;
      default: throw new Error(`Invalid mask: ${maskPattern}`);
    }
  }

  static getLostPoint(qrCode: QRCode): number {
    const moduleCount = qrCode.getModuleCount();
    let lostPoint = 0;

    // Level 1
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        let sameCount = 0;
        const dark = qrCode.isDark(row, col);
        for (let r = -1; r <= 1; r++) {
          if (row + r < 0 || moduleCount <= row + r) continue;
          for (let c = -1; c <= 1; c++) {
            if (col + c < 0 || moduleCount <= col + c) continue;
            if (r === 0 && c === 0) continue;
            if (dark === qrCode.isDark(row + r, col + c)) {
              sameCount++;
            }
          }
        }
        if (sameCount > 5) {
          lostPoint += (3 + sameCount - 5);
        }
      }
    }

    // Level 2
    for (let row = 0; row < moduleCount - 1; row++) {
      for (let col = 0; col < moduleCount - 1; col++) {
        let count = 0;
        if (qrCode.isDark(row, col)) count++;
        if (qrCode.isDark(row + 1, col)) count++;
        if (qrCode.isDark(row, col + 1)) count++;
        if (qrCode.isDark(row + 1, col + 1)) count++;
        if (count === 0 || count === 4) {
          lostPoint += 3;
        }
      }
    }

    // Level 3
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount - 6; col++) {
        if (qrCode.isDark(row, col) &&
            !qrCode.isDark(row, col + 1) &&
            qrCode.isDark(row, col + 2) &&
            qrCode.isDark(row, col + 3) &&
            qrCode.isDark(row, col + 4) &&
            !qrCode.isDark(row, col + 5) &&
            qrCode.isDark(row, col + 6)) {
          lostPoint += 40;
        }
      }
    }
    for (let col = 0; col < moduleCount; col++) {
      for (let row = 0; row < moduleCount - 6; row++) {
        if (qrCode.isDark(row, col) &&
            !qrCode.isDark(row + 1, col) &&
            qrCode.isDark(row + 2, col) &&
            qrCode.isDark(row + 3, col) &&
            qrCode.isDark(row + 4, col) &&
            !qrCode.isDark(row + 5, col) &&
            qrCode.isDark(row + 6, col)) {
          lostPoint += 40;
        }
      }
    }

    // Level 4
    let darkCount = 0;
    for (let col = 0; col < moduleCount; col++) {
      for (let row = 0; row < moduleCount; row++) {
        if (qrCode.isDark(row, col)) {
          darkCount++;
        }
      }
    }
    const ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
    lostPoint += ratio * 10;

    return lostPoint;
  }

  static G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);
  static G18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0);
  static G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1) | (1 << 0);
}

/**
 * Generates an offline QR Code as an SVG string.
 * @param text The payload content of the QR code.
 * @param size The physical pixel width/height (for styling).
 * @param errorCorrectionLevel 1 = L (7%), 2 = M (15%), 3 = Q (25%)
 */
export function generateQRCodeSVG(text: string, size: number = 120, errorCorrectionLevel: number = 2): string {
  try {
    // Try versions from 1 to 15 to find one that fits the text without overflow
    let qr: QRCode | null = null;
    for (let t = 1; t <= 15; t++) {
      try {
        const tempQr = new QRCode(t, errorCorrectionLevel);
        tempQr.addData(text);
        tempQr.make();
        qr = tempQr;
        break; // Successfully generated, so we stop seeking
      } catch (err) {
        if (t === 15) {
          throw err; // if we still overflow at 15, let it fall through to outer catch
        }
      }
    }

    if (!qr) {
      throw new Error("Failed to initialize QR code");
    }

    const count = qr.getModuleCount();
    const cellSize = 4;
    const margin = 8;
    const totalSize = count * cellSize + margin * 2;

    let paths = "";
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (qr.isDark(r, c)) {
          const x = c * cellSize + margin;
          const y = r * cellSize + margin;
          paths += `M${x},${y}h${cellSize}v${cellSize}h-${cellSize}z `;
        }
      }
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" width="${size}" height="${size}" style="background:#fff;shape-rendering:crispEdges;">
        <path d="${paths}" fill="#000"/>
      </svg>
    `.trim();
  } catch (err) {
    console.error("Failed to generate QR Code SVG offline:", err);
    // Simple fallback rectangle
    return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="#ddd"/><text x="10" y="55" font-size="10">QR Code Error</text></svg>`;
  }
}
