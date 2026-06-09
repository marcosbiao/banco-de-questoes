import html2pdf from 'html2pdf.js';
import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import ListaPdfDocument from '../../components/listas/ListaPdfDocument.jsx';
import { slugify } from '../../utils/textNormalizer.js';
import { getListaPreview } from '../firebase/listasFirestoreService.js';

const PDF_ERROR_MESSAGE = 'Não foi possível gerar o PDF. A lista parece estar vazia ou não foi carregada corretamente.';

function pdfFilename(lista, incluirGabarito) {
  const base = slugify(`lista de exercicios ${lista?.titulo || 'lista'}`).replace(/-/g, '_') || 'lista_de_exercicios';
  return `${base}_${incluirGabarito ? 'com_gabarito' : 'sem_gabarito'}.pdf`;
}

async function waitForRender() {
  if (document.fonts?.ready) {
    await document.fonts.ready.catch(() => undefined);
  }

  await new Promise((resolve) => requestAnimationFrame(resolve));
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

async function waitForImages(container) {
  const images = Array.from(container.querySelectorAll('img'));

  if (!images.length) return;

  await Promise.all(images.map((image) => {
    if (image.complete) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const timeout = window.setTimeout(resolve, 8000);
      const finish = () => {
        window.clearTimeout(timeout);
        resolve();
      };

      image.addEventListener('load', finish, { once: true });
      image.addEventListener('error', finish, { once: true });
    });
  }));
}

function hasRenderedQuestions(lista) {
  return (lista?.blocos || []).some((bloco) => Array.isArray(bloco.questoes) && bloco.questoes.length > 0);
}

async function resolveListaCompleta(listaOrId) {
  if (typeof listaOrId === 'string') {
    return getListaPreview(listaOrId);
  }

  if (listaOrId?.id && !hasRenderedQuestions(listaOrId)) {
    return getListaPreview(listaOrId.id);
  }

  return listaOrId;
}

function assertListaValida(lista) {
  if (!lista || !Array.isArray(lista.blocos) || lista.blocos.length === 0 || !hasRenderedQuestions(lista)) {
    throw new Error(PDF_ERROR_MESSAGE);
  }
}

function createPdfContainer() {
  const container = document.createElement('div');

  container.className = 'pdf-render-container';
  container.setAttribute('aria-hidden', 'true');
  Object.assign(container.style, {
    position: 'absolute',
    left: '0',
    top: '0',
    width: '794px',
    minHeight: '1123px',
    background: '#ffffff',
    color: '#000000',
    zIndex: '-1',
    pointerEvents: 'none',
  });
  document.body.appendChild(container);

  return container;
}

function assertConteudoRenderizado(container) {
  const documentElement = container.querySelector('[data-pdf-document]');
  const questionElements = container.querySelectorAll('.pdf-question');
  const textContent = (documentElement?.innerText || container.innerText || '').trim();

  if (!documentElement || questionElements.length === 0 || textContent.length < 20) {
    throw new Error(PDF_ERROR_MESSAGE);
  }

  return documentElement;
}

export async function exportarPdfLista(listaOrId, incluirGabarito = false) {
  const lista = await resolveListaCompleta(listaOrId);

  assertListaValida(lista);

  const container = createPdfContainer();
  const root = createRoot(container);

  try {
    flushSync(() => {
      root.render(React.createElement(ListaPdfDocument, { lista, incluirGabarito }));
    });

    await waitForRender();
    await waitForImages(container);
    await waitForRender();

    const documentElement = assertConteudoRenderizado(container);

    await html2pdf()
      .set({
        margin: 10,
        filename: pdfFilename(lista, incluirGabarito),
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait',
        },
        pagebreak: {
          mode: ['css', 'legacy'],
          avoid: ['.pdf-question', '.pdf-block-title'],
        },
      })
      .from(documentElement)
      .save();
  } catch (error) {
    throw new Error(error.message || PDF_ERROR_MESSAGE);
  } finally {
    root.unmount();
    container.remove();
  }
}
