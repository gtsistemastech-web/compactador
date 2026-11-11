# ⚡ OptiShrink Web
### *Compactador Extremo de Arquivos e PDFs com Foco em Qualidade Visual*

O **OptiShrink Web** é uma aplicação web moderna, ultra-rápida e 100% *client-side* (roda direto no navegador via JavaScript e WebAssembly). Ele foi desenvolvido especificamente para compactar ao extremo **PDFs (especialmente documentos escaneados e ofícios de tribunais como PJe e SEI)**, imagens e arquivos genéricos, mantendo nitidez impecável para leitura e assinaturas.

---

## 🌟 Principais Recursos

- 📄 **Compressão Extrema de PDFs (60% a 90% de redução):**
  - Renderização página a página com `pdf.js` (Mozilla).
  - Reamostragem adaptativa de DPI (110 DPI / 96 DPI / 75 DPI).
  - Remontagem do documento com `pdf-lib` em streams otimizados de JPEG.
  - Não estoura a memória do navegador nem em PDFs com dezenas de páginas.
- ✂️ **Divisão de Arquivos em Partes (Splitter Integrado):**
  - **Dividir em X partes iguais:** Ex: divide um processo de 300 páginas em 3 volumes de 100 páginas já comprimidos.
  - **Dividir a cada X páginas:** Ex: gera volumes de 50 páginas cada para respeitar tetos de envio do PJe/SEI.
  - Download individual de cada parte ou botão de **"Baixar Todas as Partes (.ZIP)"**.
- 🖨️ **Modo Processos / Documentos P&B:**
  - Remove ruídos cinzentos do papel do scanner, embranquece o fundo e escurece o texto preto. Compacta até 40% a mais com máxima nitidez.
- 🖼️ **Otimização de Imagens:**
  - Conversão inteligente para **WebP** com quantização perceptual de qualidade.
  - Limite de resolução máxima para evitar pixels desperdiçados.
- 📦 **Compactação Geral e Lote em ZIP:**
  - Processamento em lote com fila visual de progresso.
  - Download individual ou botão de **"Baixar Todos (.ZIP)"** com algoritmo Deflate Ultra via `fflate`.
- 🔒 **100% Seguro e Privado:**
  - **Nenhum arquivo sai do seu computador.** Todo o processamento acontece na memória RAM local do seu navegador. Ideal para documentos sigilosos, processos e dados sensíveis.
- 🌐 **Pronto para o GitHub Pages:**
  - Sem necessidade de Node.js, compilação ou servidores de backend. É só subir no GitHub e ativar o Pages!

---

## 🎚️ Níveis de Compactação (Presets)

| Nível | DPI do PDF | Qualidade Perceptual | Redução Média | Recomendado Para |
| :--- | :---: | :---: | :---: | :--- |
| **Leve** | 180 DPI | 82% | **~45% a 60%** | Impressão fina e documentos com fotos de alta fidelidade |
| **Equilibrado (⭐)** | 130 DPI | 68% | **~70% a 80%** | Uso geral, leitura em tela e arquivos para processos |
| **Extremo** | 96 DPI | 52% | **~85% a 92%** | E-mails e sistemas com limites rígidos (PJe, SEI, WhatsApp) |

---

## 🚀 Como Hospedar no GitHub Pages (Passo a Passo)

Como a aplicação é 100% estática, colocá-la online no GitHub Pages é simples e gratuito:

1. **Crie um repositório no seu GitHub:**
   - Acesse [github.com/new](https://github.com/new).
   - Dê um nome ao repositório (ex: `optishrink` ou `compressor-pdf`).
   - Deixe como **Public** (ou Private se tiver plano Pro/Team).

2. **Envie os arquivos da pasta:**
   Você pode subir os arquivos via terminal ou arrastando diretamente no site do GitHub:
   ```bash
   cd optishrink-web
   git init
   git add .
   git commit -m "feat: initial commit optishrink web"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
   git push -u origin main
   ```

3. **Ative o GitHub Pages:**
   - No seu repositório no GitHub, clique na aba **Settings** (Configurações).
   - No menu lateral esquerdo, clique em **Pages**.
   - Em **Build and deployment > Source**, selecione **Deploy from a branch**.
   - Em **Branch**, selecione `main` e a pasta `/ (root)`.
   - Clique em **Save**.

🎉 **Pronto!** Em cerca de 1 a 2 minutos, o GitHub fornecerá o link público da sua aplicação (ex: `https://seu-usuario.github.io/optishrink/`).

---

## 🖥️ Como Executar Localmente no Computador

Você não precisa instalar nada! Para testar no seu computador agora:

- Basta dar um **duplo clique no arquivo `index.html`** para abrir no seu navegador padrão (Google Chrome, Edge, Firefox, Brave).
- Ou, se preferir via servidor local leve (ex: VS Code Live Server ou Python):
  ```bash
  python -m http.server 8000
  ```
  E abra `http://localhost:8000` no navegador.

---

## 📂 Estrutura de Arquivos

```
optishrink-web/
├── index.html        # Estrutura visual, CDN das bibliotecas e dropzone
├── styles.css        # Design moderno (dark theme, responsivo, animações)
├── app.js            # Motor de compactação (PDF.js + PDF-Lib + fflate)
└── README.md         # Documentação e guia de publicação
```

---

## 📄 Licença
Distribuído sob a licença MIT. Livre para uso pessoal, comercial e institucional.
