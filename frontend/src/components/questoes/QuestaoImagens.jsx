import { altImagemQuestao, normalizarImagensQuestao } from '../../utils/questionImages.js';

export default function QuestaoImagens({ imagens, className = '' }) {
  const imagensValidas = normalizarImagensQuestao(imagens);

  if (!imagensValidas.length) {
    return null;
  }

  return (
    <div className={`question-images ${className}`}>
      {imagensValidas.map((imagem, index) => {
        const captionItems = [
          imagem.legenda,
          imagem.fonte ? `Fonte: ${imagem.fonte}` : '',
        ].filter(Boolean);

        return (
          <figure className="question-image-wrapper" key={`${imagem.path || imagem.url}-${index}`}>
            <img src={imagem.url} alt={altImagemQuestao(imagem, index)} />
            {captionItems.length ? (
              <figcaption className="question-image-caption">{captionItems.join(' | ')}</figcaption>
            ) : null}
          </figure>
        );
      })}
    </div>
  );
}
