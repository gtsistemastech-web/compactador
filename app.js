/**
 * OptiShrink Web - Core Engine
 * Compactação Extrema Client-Side (100% no navegador)
 * Foco em PDFs, Imagens e Empacotamento em Lote
 */

// Inicialização do Worker do PDF.js (Local com fallback)
if (typeof pdfjsLib !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
  } catch (e) {
    console.warn('Aviso na inicialização do worker:', e);
  }
}

// Helper para obter com segurança a instância do PDFLib
function getPDFLib() {
  if (typeof PDFLib !== 'undefined') return PDFLib;
  if (typeof window !== 'undefined' && window.PDFLib) return window.PDFLib;
  return null;
}

// Estado Global da Aplicação
const state = {
  preset: 'balanced', // light | balanced | extreme
  quality: 0.52,      // 0.25 a 0.90 (Calibrado para redução garantida)
  dpi: 96,            // 60 a 180 DPI (96 DPI é a resolução padrão de monitores e documentos nítidos)
  grayscale: false,   // Modo P&B inteligente para processos e ofícios
  convertToWebp: true,
  // Opções de Divisão (Splitter)
  splitEnabled: false,
  splitType: 'fixedParts', // 'fixedParts' | 'pagesPerPart'
  numParts: 3,
  pagesPerPart: 50,
  files: [],          // Lista de itens na fila
  isProcessingAll: false
};

// Mapeamento de Presets Calibrados
const PRESETS = {
  light: { dpi: 110, quality: 0.65 },
  balanced: { dpi: 96, quality: 0.52 },
  extreme: { dpi: 75, quality: 0.40 }
};

// Elementos do DOM
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const queueSection = document.getElementById('queueSection');
const queueList = document.getElementById('queueList');
const totalFilesCount = document.getElementById('totalFilesCount');
const overallSavingsBadge = document.getElementById('overallSavingsBadge');

const btnProcessAll = document.getElementById('btnProcessAll');
const btnDownloadZip = document.getElementById('btnDownloadZip');
const btnClearAll = document.getElementById('btnClearAll');

const sliderQuality = document.getElementById('sliderQuality');
const labelQualityValue = document.getElementById('labelQualityValue');
const sliderDpi = document.getElementById('sliderDpi');
const labelDpiValue = document.getElementById('labelDpiValue');
const checkGrayscale = document.getElementById('checkGrayscale');
const checkConvertToWebp = document.getElementById('checkConvertToWebp');

// Elementos de Divisão (Splitter)
const checkEnableSplit = document.getElementById('checkEnableSplit');
const splitBody = document.getElementById('splitBody');
const splitStatusText = document.getElementById('splitStatusText');
const boxSplitFixed = document.getElementById('boxSplitFixed');
const boxSplitPages = document.getElementById('boxSplitPages');
const inputNumParts = document.getElementById('inputNumParts');
const inputPagesPerPart = document.getElementById('inputPagesPerPart');

const previewModal = document.getElementById('previewModal');
const previewTitle = document.getElementById('previewTitle');
const previewBody = document.getElementById('previewBody');
const btnClosePreview = document.getElementById('btnClosePreview');

// ==========================================
// 1. GERENCIAMENTO DE EVENTOS E PRESETS
// ==========================================

document.querySelectorAll('input[name="preset"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    state.preset = e.target.value;
    
    // Atualiza classes ativas
    document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
    e.target.closest('.preset-card').classList.add('active');

    // Aplica valores do preset selecionado
    const p = PRESETS[state.preset];
    if (p) {
      state.dpi = p.dpi;
      state.quality = p.quality;
      sliderDpi.value = p.dpi;
      labelDpiValue.textContent = `${p.dpi} DPI`;
      sliderQuality.value = Math.round(p.quality * 100);
      labelQualityValue.textContent = `${sliderQuality.value}%`;
    }
  });
});

sliderQuality.addEventListener('input', (e) => {
  const val = parseInt(e.target.value, 10);
  state.quality = val / 100;
  labelQualityValue.textContent = `${val}%`;
});

sliderDpi.addEventListener('input', (e) => {
  const val = parseInt(e.target.value, 10);
  state.dpi = val;
  labelDpiValue.textContent = `${val} DPI`;
});

checkConvertToWebp.addEventListener('change', (e) => {
  state.convertToWebp = e.target.checked;
});

if (checkGrayscale) {
  checkGrayscale.addEventListener('change', (e) => {
    state.grayscale = e.target.checked;
  });
}

// ==========================================
// CONTROLES DE DIVISÃO DE ARQUIVO (SPLITTER)
// ==========================================

if (checkEnableSplit) {
  checkEnableSplit.addEventListener('change', (e) => {
    state.splitEnabled = e.target.checked;
    const splitCard = e.target.closest('.split-card');
    if (state.splitEnabled) {
      splitBody.style.display = 'block';
      splitStatusText.textContent = 'Ativado';
      if (splitCard) splitCard.classList.add('active');
    } else {
      splitBody.style.display = 'none';
      splitStatusText.textContent = 'Desativado';
      if (splitCard) splitCard.classList.remove('active');
    }
  });
}

document.querySelectorAll('input[name="splitType"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    state.splitType = e.target.value;
    if (state.splitType === 'fixedParts') {
      if (boxSplitFixed) boxSplitFixed.classList.add('active');
      if (boxSplitPages) boxSplitPages.classList.remove('active');
      if (inputNumParts) inputNumParts.disabled = false;
      if (inputPagesPerPart) inputPagesPerPart.disabled = true;
    } else {
      if (boxSplitPages) boxSplitPages.classList.add('active');
      if (boxSplitFixed) boxSplitFixed.classList.remove('active');
      if (inputPagesPerPart) inputPagesPerPart.disabled = false;
      if (inputNumParts) inputNumParts.disabled = true;
    }
  });
});

if (inputNumParts) {
  inputNumParts.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 2) state.numParts = val;
  });
}

if (inputPagesPerPart) {
  inputPagesPerPart.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1) state.pagesPerPart = val;
  });
}

// Dropzone Drag & Drop
['dragenter', 'dragover'].forEach(eventName => {
  dropzone.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.add('dragover');
  });
});

['dragleave', 'drop'].forEach(eventName => {
  dropzone.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.remove('dragover');
  });
});

dropzone.addEventListener('drop', (e) => {
  const dt = e.dataTransfer;
  const files = dt.files;
  if (files && files.length > 0) {
    handleFilesSelected(files);
  }
});

dropzone.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files.length > 0) {
    handleFilesSelected(e.target.files);
    fileInput.value = ''; // Limpa para permitir selecionar o mesmo arquivo novamente
  }
});

// ==========================================
// 2. CONTROLE DA FILA DE ARQUIVOS
// ==========================================

function handleFilesSelected(fileList) {
  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    const id = 'f_' + Math.random().toString(36).substr(2, 9);
    
    let typeCategory = 'archive';
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      typeCategory = 'pdf';
    } else if (file.type.startsWith('image/')) {
      typeCategory = 'image';
    }

    const item = {
      id,
      file,
      name: file.name,
      originalSize: file.size,
      compressedSize: 0,
      typeCategory,
      status: 'pending', // pending | processing | done | error
      progress: 0,
      statusText: 'Pronto para compactar',
      compressedBlob: null,
      compressedUrl: null,
      errorMsg: null
    };

    state.files.push(item);
  }

  updateQueueUI();
}

function updateQueueUI() {
  if (state.files.length === 0) {
    queueSection.style.display = 'none';
    return;
  }

  queueSection.style.display = 'block';
  totalFilesCount.textContent = state.files.length;

  queueList.innerHTML = '';
  state.files.forEach(item => {
    queueList.appendChild(createFileCardElement(item));
  });

  updateOverallSavings();
}

function createFileCardElement(item) {
  const card = document.createElement('div');
  card.className = 'file-card';
  card.id = `card_${item.id}`;

  let iconHtml = '<i class="fa-solid fa-file-zipper"></i>';
  if (item.typeCategory === 'pdf') {
    iconHtml = '<i class="fa-solid fa-file-pdf"></i>';
  } else if (item.typeCategory === 'image') {
    iconHtml = '<i class="fa-solid fa-file-image"></i>';
  }

  const origSizeFormatted = formatBytes(item.originalSize);
  let compSizeFormatted = item.compressedSize > 0 ? formatBytes(item.compressedSize) : '';
  let reductionPercent = '';
  let isLarger = false;
  
  if (item.status === 'done' && item.compressedSize > 0) {
    if (item.compressedSize > item.originalSize) {
      isLarger = true;
      const increase = Math.round(((item.compressedSize - item.originalSize) / item.originalSize) * 100);
      reductionPercent = `+${increase}% (Aumentou)`;
    } else {
      const saved = item.originalSize - item.compressedSize;
      const pct = Math.round((saved / item.originalSize) * 100);
      reductionPercent = `-${pct}%`;
    }
  }

  card.innerHTML = `
    <div class="file-main-row">
      <div class="file-info">
        <div class="file-icon ${item.typeCategory}">
          ${iconHtml}
        </div>
        <div class="file-details">
          <div class="file-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
          <div class="file-meta">
            <span>Tamanho: ${origSizeFormatted}</span>
            ${compSizeFormatted ? `<span> ➔ <strong style="color: ${isLarger ? '#fbbf24' : '#34d399'};">${compSizeFormatted}</strong></span>` : ''}
          </div>
        </div>
      </div>

      <div class="file-status-group">
        ${reductionPercent ? `<span class="reduction-badge ${isLarger ? 'warning' : ''}">${reductionPercent}</span>` : ''}
        <span class="badge-status ${item.status}">${getStatusLabel(item)}</span>

        <div class="file-actions">
          ${item.status === 'done' ? `
            <button class="btn-icon download" onclick="downloadFile('${item.id}')" title="Baixar Arquivo Compactado">
              <i class="fa-solid fa-download"></i>
            </button>
            <button class="btn-icon" onclick="openPreview('${item.id}')" title="Visualizar Prévia">
              <i class="fa-solid fa-eye"></i>
            </button>
          ` : ''}
          ${item.status === 'pending' ? `
            <button class="btn-icon" onclick="processSingleItem('${item.id}')" title="Compactar este arquivo">
              <i class="fa-solid fa-play"></i>
            </button>
          ` : ''}
          <button class="btn-icon" onclick="removeFile('${item.id}')" title="Remover da fila">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>
    </div>

    ${isLarger ? `
      <div style="font-size: 0.82rem; color: #fbbf24; background: rgba(245, 158, 11, 0.1); padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(245, 158, 11, 0.3); display: flex; align-items: center; gap: 8px;">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <span><strong>Aviso:</strong> O documento original já estava em resolução baixa. Escolha o preset <strong>"Extremo"</strong> ou ative <strong>"Modo Processos P&B"</strong> para forçar a redução.</span>
      </div>
    ` : ''}

    ${(item.status === 'done' && item.parts && item.parts.length > 1) ? `
      <div class="parts-container">
        <div class="parts-header-row">
          <span><i class="fa-solid fa-scissors"></i> Documento Dividido em ${item.parts.length} Partes</span>
          <button class="btn-zip-all-parts" onclick="downloadAllPartsZip('${item.id}')">
            <i class="fa-solid fa-file-zipper"></i> Baixar Todas as Partes (.ZIP)
          </button>
        </div>
        ${item.parts.map((p, idx) => `
          <div class="part-item">
            <div class="part-info">
              <span class="part-badge">Parte ${idx + 1}</span>
              <div style="min-width: 0;">
                <div class="part-name" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</div>
                <div class="part-meta">Páginas ${p.startPage} a ${p.endPage} (${p.pageCount} págs) • <strong style="color: #34d399;">${formatBytes(p.size)}</strong></div>
              </div>
            </div>
            <button class="btn-part-download" onclick="downloadPart('${item.id}', ${idx})" title="Baixar esta parte">
              <i class="fa-solid fa-download"></i> Baixar
            </button>
          </div>
        `).join('')}
      </div>
    ` : ''}

    ${item.status === 'processing' ? `
      <div class="progress-bar-container">
        <div class="progress-bar-fill" style="width: ${item.progress}%"></div>
      </div>
      <div class="progress-text">
        <span>${item.statusText}</span>
        <span>${Math.round(item.progress)}%</span>
      </div>
    ` : ''}

    ${item.status === 'error' ? `
      <div style="font-size: 0.8rem; color: #f87171;">
        <i class="fa-solid fa-triangle-exclamation"></i> ${escapeHtml(item.errorMsg || 'Erro desconhecido')}
      </div>
    ` : ''}
  `;

  return card;
}

function getStatusLabel(item) {
  switch (item.status) {
    case 'pending': return 'Pendente';
    case 'processing': return 'Compactando...';
    case 'done': return 'Concluído';
    case 'error': return 'Falha';
    default: return item.status;
  }
}

function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function removeFile(id) {
  const item = state.files.find(f => f.id === id);
  if (item) {
    if (item.compressedUrl) URL.revokeObjectURL(item.compressedUrl);
    if (item.parts) {
      item.parts.forEach(p => { if (p.url) URL.revokeObjectURL(p.url); });
    }
  }
  state.files = state.files.filter(f => f.id !== id);
  updateQueueUI();
}

btnClearAll.addEventListener('click', () => {
  state.files.forEach(item => {
    if (item.compressedUrl) URL.revokeObjectURL(item.compressedUrl);
    if (item.parts) {
      item.parts.forEach(p => { if (p.url) URL.revokeObjectURL(p.url); });
    }
  });
  state.files = [];
  updateQueueUI();
});

function updateOverallSavings() {
  const doneFiles = state.files.filter(f => f.status === 'done' && f.compressedSize > 0);
  if (doneFiles.length === 0) {
    overallSavingsBadge.style.display = 'none';
    btnDownloadZip.style.display = 'none';
    return;
  }

  let totalOrig = 0;
  let totalComp = 0;
  doneFiles.forEach(f => {
    totalOrig += f.originalSize;
    totalComp += f.compressedSize;
  });

  const totalSaved = Math.max(0, totalOrig - totalComp);
  const pct = Math.round((totalSaved / totalOrig) * 100);

  overallSavingsBadge.style.display = 'inline-block';
  overallSavingsBadge.textContent = `Economia Total: -${pct}% (${formatBytes(totalSaved)} economizados)`;

  btnDownloadZip.style.display = 'inline-flex';
}

// ==========================================
// 3. MOTOR DE COMPACTAÇÃO EXTREMA DE PDF
// ==========================================

/**
 * Comprime um PDF reamostrando páginas via PDF.js em canvas e 
 * reconstruindo via PDF-Lib em JPEG de alta eficiência.
 * Suporta divisão (splitter) em múltiplas partes.
 */
async function compressPdf(item, onProgress) {
  const lib = getPDFLib();
  if (!lib) {
    throw new Error('A biblioteca PDF-Lib não foi encontrada. Recarregue a página (F5) e tente novamente.');
  }

  onProgress(0, 100, 'Lendo arquivo na memória...');
  const arrayBuffer = await item.file.arrayBuffer();
  
  // 1. Carrega o PDF original com o PDF.js
  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
    cMapPacked: true
  });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const baseName = item.name.replace(/\.pdf$/i, "");

  // 2. Calcula os blocos de páginas (chunks) se a divisão estiver ativada
  let chunks = [];
  if (state.splitEnabled && numPages > 1) {
    if (state.splitType === 'fixedParts') {
      const partsCount = Math.min(Math.max(2, state.numParts), numPages);
      const pagesPerChunk = Math.ceil(numPages / partsCount);
      for (let i = 0; i < partsCount; i++) {
        const start = i * pagesPerChunk + 1;
        const end = Math.min(numPages, (i + 1) * pagesPerChunk);
        if (start <= numPages) {
          chunks.push({ start, end, partIndex: i + 1 });
        }
      }
    } else {
      // pagesPerPart
      const pagesChunk = Math.max(1, state.pagesPerPart);
      let pageCounter = 1;
      let partIdx = 1;
      while (pageCounter <= numPages) {
        const start = pageCounter;
        const end = Math.min(numPages, pageCounter + pagesChunk - 1);
        chunks.push({ start, end, partIndex: partIdx++ });
        pageCounter = end + 1;
      }
    }
  } else {
    chunks.push({ start: 1, end: numPages, partIndex: 1 });
  }

  // Cálculo da escala de DPI: base de PDF é 72 DPI
  const targetDpi = state.dpi;
  const scale = targetDpi / 72.0;
  const jpegQuality = state.quality;

  // Cria canvas reutilizável para otimização de memória
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  const generatedParts = [];
  let globalPagesProcessed = 0;

  for (let c = 0; c < chunks.length; c++) {
    const chunk = chunks[c];
    const chunkDoc = await lib.PDFDocument.create();

    for (let pageNum = chunk.start; pageNum <= chunk.end; pageNum++) {
      globalPagesProcessed++;
      const prefix = chunks.length > 1 ? `[Parte ${c + 1}/${chunks.length}] ` : '';
      onProgress(globalPagesProcessed, numPages, `${prefix}Processando pág ${pageNum} de ${numPages}...`);

      // Permite que o navegador respire e atualize a interface sem congelar
      await new Promise(r => setTimeout(r, 10));

      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      // Dimensões originais em pontos para manter proporção exata
      const unscaledViewport = page.getViewport({ scale: 1.0 });
      const originalWidthPts = unscaledViewport.width;
      const originalHeightPts = unscaledViewport.height;

      // Proteção de memória contra dimensões extremas
      let canvasWidth = Math.floor(viewport.width);
      let canvasHeight = Math.floor(viewport.height);
      const MAX_DIM = 2800;
      if (canvasWidth > MAX_DIM || canvasHeight > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / canvasWidth, MAX_DIM / canvasHeight);
        canvasWidth = Math.floor(canvasWidth * ratio);
        canvasHeight = Math.floor(canvasHeight * ratio);
      }

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // Fundo branco limpo para documentos escaneados e peças judiciais
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const renderContext = {
        canvasContext: ctx,
        viewport: page.getViewport({ scale: canvasWidth / unscaledViewport.width }),
        background: 'white'
      };

      await page.render(renderContext).promise;

      // Se o modo Processos / P&B estiver ativado, converte e remove ruídos do papel
      if (state.grayscale) {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          const v = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          const clean = v > 190 ? 255 : (v < 70 ? 0 : v);
          d[i] = clean;
          d[i + 1] = clean;
          d[i + 2] = clean;
        }
        ctx.putImageData(imgData, 0, 0);
      }

      // Converte página renderizada para JPEG comprimido
      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/jpeg', jpegQuality);
      });

      const imgBytes = new Uint8Array(await blob.arrayBuffer());
      const embeddedImage = await chunkDoc.embedJpg(imgBytes);

      // Cria página no novo PDF com as dimensões originais perfeitas
      const newPage = chunkDoc.addPage([originalWidthPts, originalHeightPts]);
      newPage.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: originalWidthPts,
        height: originalHeightPts
      });

      // Limpeza de memória do canvas entre páginas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    onProgress(globalPagesProcessed, numPages, chunks.length > 1 ? `Compactando Parte ${c + 1}...` : 'Compactando documento...');
    const partBytes = await chunkDoc.save({ useObjectStreams: true });
    const partBlob = new Blob([partBytes], { type: 'application/pdf' });
    const partName = chunks.length > 1 ? `${baseName}_parte_${c + 1}.pdf` : `${baseName}_optishrink.pdf`;

    generatedParts.push({
      name: partName,
      blob: partBlob,
      size: partBlob.size,
      url: URL.createObjectURL(partBlob),
      startPage: chunk.start,
      endPage: chunk.end,
      pageCount: chunk.end - chunk.start + 1
    });
  }

  // Desaloca o canvas
  canvas.width = 0;
  canvas.height = 0;

  return generatedParts;
}

// ==========================================
// 4. MOTOR DE COMPACTAÇÃO DE IMAGENS
// ==========================================

async function compressImage(item, onProgress) {
  onProgress(1, 2, 'Decodificando imagem...');
  
  const bitmap = await createImageBitmap(item.file);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  let width = bitmap.width;
  let height = bitmap.height;

  // Limite inteligente de resolução para evitar desperdício de pixels
  let maxDimension = 2800; // Light
  if (state.preset === 'balanced') maxDimension = 2000;
  if (state.preset === 'extreme') maxDimension = 1400;

  if (width > maxDimension || height > maxDimension) {
    if (width > height) {
      height = Math.round((height * maxDimension) / width);
      width = maxDimension;
    } else {
      width = Math.round((width * maxDimension) / height);
      height = maxDimension;
    }
  }

  canvas.width = width;
  canvas.height = height;

  // Se a imagem tiver transparência e formos salvar em JPEG, preserva fundo branco
  const mimeType = state.convertToWebp ? 'image/webp' : 'image/jpeg';
  if (mimeType === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  onProgress(2, 2, 'Aplicando compressão perceptual...');

  const compressedBlob = await new Promise(resolve => {
    canvas.toBlob(resolve, mimeType, state.quality);
  });

  // Limpeza
  canvas.width = 0;
  canvas.height = 0;

  return compressedBlob;
}

// ==========================================
// 5. MOTOR DE COMPACTAÇÃO DE ARQUIVOS GERAIS (ZIP)
// ==========================================

async function compressGenericFile(item, onProgress) {
  onProgress(1, 2, 'Comprimindo arquivo com Deflate Ultra...');
  const arrayBuffer = await item.file.arrayBuffer();
  const fileBytes = new Uint8Array(arrayBuffer);

  // Usa fflate para gerar um zip ultra comprimido
  const zipData = {};
  zipData[item.name] = [fileBytes, { level: 9 }]; // Nível 9 = compressão máxima

  const zipped = fflate.zipSync(zipData);
  onProgress(2, 2, 'Concluído!');
  
  return new Blob([zipped], { type: 'application/zip' });
}

// ==========================================
// 6. PROCESSAMENTO INDIVIDUAL E EM LOTE
// ==========================================

async function processItem(item) {
  item.status = 'processing';
  item.progress = 5;
  item.statusText = 'Iniciando...';
  updateItemCardUI(item);

  try {
    if (item.typeCategory === 'pdf') {
      const parts = await compressPdf(item, (current, total, msg) => {
        item.progress = Math.min(95, Math.round((current / total) * 100));
        item.statusText = msg;
        updateItemCardUI(item);
      });

      item.parts = parts;
      item.compressedBlob = parts[0].blob;
      item.compressedUrl = parts[0].url;
      item.compressedSize = parts.reduce((acc, p) => acc + p.size, 0);
      item.statusText = parts.length > 1 
        ? `Concluído: Dividido em ${parts.length} partes!` 
        : 'Concluído com sucesso!';
    } else if (item.typeCategory === 'image') {
      const resultBlob = await compressImage(item, (current, total, msg) => {
        item.progress = Math.min(95, Math.round((current / total) * 100));
        item.statusText = msg;
        updateItemCardUI(item);
      });
      item.compressedBlob = resultBlob;
      item.compressedSize = resultBlob.size;
      item.compressedUrl = URL.createObjectURL(resultBlob);
      item.statusText = 'Concluído com sucesso!';
    } else {
      const resultBlob = await compressGenericFile(item, (current, total, msg) => {
        item.progress = Math.min(95, Math.round((current / total) * 100));
        item.statusText = msg;
        updateItemCardUI(item);
      });
      item.compressedBlob = resultBlob;
      item.compressedSize = resultBlob.size;
      item.compressedUrl = URL.createObjectURL(resultBlob);
      item.statusText = 'Concluído com sucesso!';
    }

    item.status = 'done';
    item.progress = 100;

  } catch (err) {
    console.error('Erro na compactação do item:', item.name, err);
    item.status = 'error';
    item.errorMsg = err.message || 'Falha ao processar o arquivo';
  }

  updateItemCardUI(item);
  updateOverallSavings();
}

function updateItemCardUI(item) {
  const oldCard = document.getElementById(`card_${item.id}`);
  if (oldCard) {
    const newCard = createFileCardElement(item);
    oldCard.replaceWith(newCard);
  }
}

async function processSingleItem(id) {
  const item = state.files.find(f => f.id === id);
  if (item && item.status === 'pending') {
    await processItem(item);
  }
}

btnProcessAll.addEventListener('click', async () => {
  if (state.isProcessingAll) return;
  
  const pendingItems = state.files.filter(f => f.status === 'pending');
  if (pendingItems.length === 0) return;

  state.isProcessingAll = true;
  btnProcessAll.disabled = true;

  for (const item of pendingItems) {
    await processItem(item);
  }

  state.isProcessingAll = false;
  btnProcessAll.disabled = false;
});

// ==========================================
// 7. DOWNLOADS E PRÉVIA
// ==========================================

function downloadFile(id) {
  const item = state.files.find(f => f.id === id);
  if (!item || !item.compressedUrl) return;

  let downloadName = item.name;
  if (item.typeCategory === 'image' && state.convertToWebp) {
    downloadName = downloadName.replace(/\.[^/.]+$/, "") + ".webp";
  } else if (item.typeCategory === 'pdf') {
    downloadName = downloadName.replace(/\.pdf$/i, "") + "_optishrink.pdf";
  } else if (item.typeCategory === 'archive' && !downloadName.endsWith('.zip')) {
    downloadName = downloadName + ".zip";
  }

  const a = document.createElement('a');
  a.href = item.compressedUrl;
  a.download = downloadName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Download de todos os concluídos em um único .ZIP
btnDownloadZip.addEventListener('click', async () => {
  const doneItems = state.files.filter(f => f.status === 'done' && f.compressedBlob);
  if (doneItems.length === 0) return;

  btnDownloadZip.disabled = true;
  btnDownloadZip.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gerando ZIP...';

  try {
    const zipEntries = {};

    for (const item of doneItems) {
      if (item.parts && item.parts.length > 1) {
        for (const p of item.parts) {
          const bytes = new Uint8Array(await p.blob.arrayBuffer());
          zipEntries[p.name] = bytes;
        }
      } else {
        let finalName = item.name;
        if (item.typeCategory === 'image' && state.convertToWebp) {
          finalName = finalName.replace(/\.[^/.]+$/, "") + ".webp";
        } else if (item.typeCategory === 'pdf') {
          finalName = finalName.replace(/\.pdf$/i, "") + "_optishrink.pdf";
        }

        const bytes = new Uint8Array(await item.compressedBlob.arrayBuffer());
        zipEntries[finalName] = bytes;
      }
    }

    const zipBuffer = fflate.zipSync(zipEntries, { level: 6 });
    const zipBlob = new Blob([zipBuffer], { type: 'application/zip' });
    const zipUrl = URL.createObjectURL(zipBlob);

    const a = document.createElement('a');
    a.href = zipUrl;
    a.download = `OptiShrink_Lote_${Date.now()}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(zipUrl), 20000);

  } catch (err) {
    console.error('Erro ao gerar ZIP:', err);
    alert('Erro ao empacotar arquivos em ZIP.');
  } finally {
    btnDownloadZip.disabled = false;
    btnDownloadZip.innerHTML = '<i class="fa-solid fa-file-zipper"></i> Baixar Todos (.ZIP)';
  }
});

// Download de uma parte individual
function downloadPart(itemId, partIndex) {
  const item = state.files.find(f => f.id === itemId);
  if (!item || !item.parts || !item.parts[partIndex]) return;

  const part = item.parts[partIndex];
  const a = document.createElement('a');
  a.href = part.url;
  a.download = part.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Download de todas as partes de um único arquivo em .ZIP
async function downloadAllPartsZip(itemId) {
  const item = state.files.find(f => f.id === itemId);
  if (!item || !item.parts || item.parts.length === 0) return;

  const zipEntries = {};
  for (const p of item.parts) {
    const bytes = new Uint8Array(await p.blob.arrayBuffer());
    zipEntries[p.name] = bytes;
  }

  const zipBuffer = fflate.zipSync(zipEntries, { level: 6 });
  const zipBlob = new Blob([zipBuffer], { type: 'application/zip' });
  const zipUrl = URL.createObjectURL(zipBlob);

  const cleanName = item.name.replace(/\.pdf$/i, '');
  const a = document.createElement('a');
  a.href = zipUrl;
  a.download = `${cleanName}_partes.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => URL.revokeObjectURL(zipUrl), 20000);
}

// Modal de Prévia
function openPreview(id) {
  const item = state.files.find(f => f.id === id);
  if (!item || !item.compressedUrl) return;

  previewTitle.textContent = `Prévia: ${item.name} (${formatBytes(item.compressedSize)})`;
  previewBody.innerHTML = '';

  if (item.typeCategory === 'pdf') {
    const iframe = document.createElement('iframe');
    iframe.src = item.compressedUrl;
    previewBody.appendChild(iframe);
  } else if (item.typeCategory === 'image') {
    const img = document.createElement('img');
    img.src = item.compressedUrl;
    previewBody.appendChild(img);
  } else {
    previewBody.innerHTML = `
      <div style="text-align: center; color: #9ca3af; padding: 40px;">
        <i class="fa-solid fa-file-zipper" style="font-size: 3rem; margin-bottom: 16px;"></i>
        <p>Arquivo ZIP gerado. Clique em Baixar para abrir o conteúdo.</p>
      </div>
    `;
  }

  previewModal.style.display = 'flex';
}

btnClosePreview.addEventListener('click', () => {
  previewModal.style.display = 'none';
  previewBody.innerHTML = '';
});

previewModal.addEventListener('click', (e) => {
  if (e.target === previewModal) {
    previewModal.style.display = 'none';
    previewBody.innerHTML = '';
  }
});

// Tornar funções acessíveis globalmente no escopo do window
window.downloadFile = downloadFile;
window.downloadPart = downloadPart;
window.downloadAllPartsZip = downloadAllPartsZip;
window.openPreview = openPreview;
window.removeFile = removeFile;
window.processSingleItem = processSingleItem;
